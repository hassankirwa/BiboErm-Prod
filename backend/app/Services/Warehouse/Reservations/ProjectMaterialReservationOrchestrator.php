<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Warehouse\ItemCategory;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Events\Warehouse\ProjectMaterialsReserved;
use App\Models\User;
use App\Models\Warehouse\StockReservation;
use App\Services\Warehouse\WarehouseAuditLogger;

class ProjectMaterialReservationOrchestrator
{
    public function __construct(
        protected BomStockCheckService $bomStockCheck,
        protected FifoReservationService $fifoReservation,
        protected FifoQueueDemandRegistry $demandRegistry,
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * @param  array<int, array{item_id: int, quantity: string|float, bom_line_ref?: string|null, required_length_mm?: int|null, project_bom_line_id?: int|null}>  $bomLines
     * @return array{success: bool, reservation?: StockReservation, check: array<string, mixed>}
     */
    public function process(int $projectId, User $user, array $bomLines, ?string $notes = null, bool $emitEvents = true): array
    {
        $this->demandRegistry->record($projectId, $bomLines);

        $check = $this->bomStockCheck->check($projectId, $bomLines);

        if (! $check['can_fully_reserve']) {
            if ($emitEvents) {
                $this->emitShortage($projectId, null, $check);
            }

            return ['success' => false, 'check' => $check];
        }

        $result = $this->fifoReservation->reserveForProject(
            user: $user,
            projectId: $projectId,
            bomLines: $bomLines,
            notes: $notes,
        );

        if (! $result['success']) {
            if ($emitEvents) {
                $this->emitShortage($projectId, null, $result['check']);
            }

            return $result;
        }

        /** @var StockReservation $reservation */
        $reservation = $result['reservation'];

        $this->demandRegistry->clear($projectId);

        $this->audit->reservationCreated($reservation->id, [
            'project_id' => $projectId,
            'fifo_sequence' => $reservation->fifo_sequence,
        ]);

        if ($emitEvents) {
            event(new ProjectMaterialsReserved(
                projectId: $projectId,
                reservationId: $reservation->id,
                fifoSequence: $reservation->fifo_sequence,
            ));

            $this->audit->materialsReserved($projectId, [
                'reservation_id' => $reservation->id,
                'fifo_sequence' => $reservation->fifo_sequence,
            ]);

            event(new ProjectMaterialsReady(
                projectId: $projectId,
                reservationId: $reservation->id,
                fifoSequence: (int) $reservation->fifo_sequence,
            ));

            $this->audit->materialsReady($projectId, [
                'reservation_id' => $reservation->id,
                'fifo_sequence' => $reservation->fifo_sequence,
            ]);
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $check
     */
    protected function emitShortage(int $projectId, ?int $reservationId, array $check): void
    {
        $shortageLines = collect($check['lines'] ?? [])
            ->filter(fn (array $line) => bccomp((string) ($line['shortage'] ?? '0'), '0', 3) === 1)
            ->map(fn (array $line) => [
                'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                'warehouse_item_id' => $line['item_id'],
                'qty_required' => (string) $line['required'],
                'qty_available' => bcadd((string) $line['available'], (string) ($line['offcut_usable'] ?? '0'), 3),
                'qty_short' => (string) $line['shortage'],
            ])
            ->values()
            ->all();

        event(new ProjectMaterialShortageDetected(
            projectId: $projectId,
            reservationId: $reservationId,
            shortageLines: $shortageLines,
        ));

        $this->audit->shortageDetected($projectId, [
            'reservation_id' => $reservationId,
            'lines' => $shortageLines,
        ]);
    }

    /**
     * @param  array<int, array{warehouse_item_id: int, qty_required: string|float, project_bom_line_id?: int|null, required_length_mm?: int|null, bom_line_ref?: string|null}>  $lineSummary
     * @return array<int, array{item_id: int, quantity: string|float, bom_line_ref?: string|null, required_length_mm?: int|null, project_bom_line_id?: int|null}>
     */
    public static function normalizeBomLines(array $lineSummary): array
    {
        return array_map(fn (array $line) => [
            'item_id' => (int) ($line['item_id'] ?? $line['warehouse_item_id']),
            'quantity' => $line['quantity'] ?? $line['qty_required'],
            'bom_line_ref' => $line['bom_line_ref'] ?? null,
            'required_length_mm' => isset($line['required_length_mm']) ? (int) $line['required_length_mm'] : null,
            'project_bom_line_id' => isset($line['project_bom_line_id']) ? (int) $line['project_bom_line_id'] : null,
        ], $lineSummary);
    }
}
