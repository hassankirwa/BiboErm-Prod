<?php

namespace App\Services\Warehouse\Movements;

use App\Enums\Warehouse\ReservationStatus;
use App\Models\User;
use App\Models\Warehouse\StockReservation;
use App\Services\Warehouse\Reservations\BomStockCheckService;
use App\Services\Warehouse\Reservations\FifoQueueDemandRegistry;
use App\Services\Warehouse\Reservations\ProjectMaterialReservationOrchestrator;
use App\Services\Warehouse\WarehouseAuditLogger;

class GrnReservationFulfillmentService
{
    public function __construct(
        protected BomStockCheckService $bomStockCheck,
        protected FifoQueueDemandRegistry $demandRegistry,
        protected ProjectMaterialReservationOrchestrator $orchestrator,
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * After GRN stock is received, attempt to fulfill a project shortage incrementally.
     *
     * @param  array<int, array{warehouse_item_id: int, qty_accepted: string|float, to_bin_id?: int|null}>  $acceptedLines
     * @param  array<int, array{warehouse_item_id: int, qty_required: string|float, required_length_mm?: int|null, bom_line_ref?: string|null, project_bom_line_id?: int|null}>  $bomLineSummary
     * @return array{success: bool, reservation?: StockReservation, check?: array<string, mixed>}|null
     */
    public function attemptFulfillment(
        int $projectId,
        User $user,
        int $goodsReceiptId,
        array $acceptedLines,
        array $bomLineSummary,
    ): ?array {
        if ($bomLineSummary === []) {
            return null;
        }

        if ($this->hasActiveReservation($projectId)) {
            return null;
        }

        $bomLines = ProjectMaterialReservationOrchestrator::normalizeBomLines($bomLineSummary);

        $this->demandRegistry->record($projectId, $bomLines);

        $check = $this->bomStockCheck->check($projectId, $bomLines);

        $this->audit->grnShortageRecheck($projectId, [
            'goods_receipt_id' => $goodsReceiptId,
            'can_fully_reserve' => $check['can_fully_reserve'],
            'received_lines' => count($acceptedLines),
        ]);

        if (! $check['can_fully_reserve']) {
            return ['success' => false, 'check' => $check];
        }

        $result = $this->orchestrator->process(
            projectId: $projectId,
            user: $user,
            bomLines: $bomLines,
            notes: "GRN #{$goodsReceiptId} fulfilled project shortage",
            emitEvents: true,
        );

        if ($result['success']) {
            $this->audit->grnReservationFulfilled($projectId, [
                'goods_receipt_id' => $goodsReceiptId,
                'reservation_id' => $result['reservation']->id,
            ]);
        }

        return $result;
    }

    protected function hasActiveReservation(int $projectId): bool
    {
        return StockReservation::query()
            ->where('project_id', $projectId)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Partial,
            ])
            ->exists();
    }
}
