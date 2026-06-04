<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Production\ProductionStage;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\User;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Warehouse\Movements\StockMovementService;
use App\Services\Warehouse\WarehouseAuditLogger;

class StageMaterialReleaseService
{
    public function __construct(
        protected FifoReservationService $fifoReservation,
        protected StockMovementService $movements,
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * @return array{reservation: StockReservation|null, movement_id: int|null}
     */
    public function releaseForStage(int $projectId, ProductionStage $stage, User $performer): array
    {
        $reservation = StockReservation::query()
            ->where('project_id', $projectId)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Partial,
            ])
            ->latest('id')
            ->first();

        if (! $reservation) {
            return ['reservation' => null, 'movement_id' => null];
        }

        $categories = $this->categoriesForStage($stage);

        if ($categories === []) {
            return ['reservation' => $reservation, 'movement_id' => null];
        }

        $reservation->load(['lines.item']);

        $beforeReleased = $this->releasedQuantitiesByLine($reservation);

        $itemIds = StockReservationLine::query()
            ->where('reservation_id', $reservation->id)
            ->whereHas('item', fn ($q) => $q->whereIn('category', array_map(fn (ItemCategory $c) => $c->value, $categories)))
            ->pluck('item_id')
            ->unique()
            ->all();

        if ($itemIds === []) {
            return ['reservation' => $reservation, 'movement_id' => null];
        }

        $updated = $this->fifoReservation->release(
            reservation: $reservation,
            itemIds: $itemIds,
        );

        $movementLines = [];

        foreach ($updated->lines as $line) {
            $previous = $beforeReleased[$line->id] ?? '0';
            $delta = bcsub((string) $line->quantity_released, $previous, 3);

            if (bccomp($delta, '0', 3) !== 1) {
                continue;
            }

            $movementLines[] = [
                'item_id' => $line->item_id,
                'from_bin_id' => $line->bin_id,
                'quantity' => $delta,
            ];
        }

        $movementId = null;

        if ($movementLines !== []) {
            $movement = $this->movements->recordOutboundDocument(
                performer: $performer,
                lines: $movementLines,
                referenceType: 'project',
                referenceId: $projectId,
                notes: "Production stage release: {$stage->value}",
            );
            $movementId = $movement->id;
        }

        $this->audit->reservationReleased($updated->id, [
            'project_id' => $projectId,
            'production_stage' => $stage->value,
            'item_ids' => $itemIds,
            'movement_id' => $movementId,
        ]);

        return ['reservation' => $updated, 'movement_id' => $movementId];
    }

    /**
     * @return list<ItemCategory>
     */
    public function categoriesForStage(ProductionStage $stage): array
    {
        return match ($stage) {
            ProductionStage::Cutting, ProductionStage::MaterialPrep => [ItemCategory::AluminiumProfile],
            ProductionStage::Fabrication, ProductionStage::Sash => [ItemCategory::Accessory],
            ProductionStage::GlassAssembly, ProductionStage::Finishing => [ItemCategory::Rubber],
            default => [],
        };
    }

    /**
     * @return array<int, string>
     */
    private function releasedQuantitiesByLine(StockReservation $reservation): array
    {
        return StockReservationLine::query()
            ->where('reservation_id', $reservation->id)
            ->pluck('quantity_released', 'id')
            ->map(fn ($qty) => (string) $qty)
            ->all();
    }
}
