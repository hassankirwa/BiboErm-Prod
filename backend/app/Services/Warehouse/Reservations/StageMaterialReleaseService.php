<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Production\ProductionStage;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Warehouse\WarehouseAuditLogger;

class StageMaterialReleaseService
{
    public function __construct(
        protected FifoReservationService $fifoReservation,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function releaseForStage(int $projectId, ProductionStage $stage): ?StockReservation
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
            return null;
        }

        $categories = $this->categoriesForStage($stage);

        if ($categories === []) {
            return null;
        }

        $itemIds = StockReservationLine::query()
            ->where('reservation_id', $reservation->id)
            ->whereHas('item', fn ($q) => $q->whereIn('category', array_map(fn (ItemCategory $c) => $c->value, $categories)))
            ->pluck('item_id')
            ->unique()
            ->all();

        if ($itemIds === []) {
            return null;
        }

        $updated = $this->fifoReservation->release(
            reservation: $reservation,
            itemIds: $itemIds,
        );

        $this->audit->reservationReleased($updated->id, [
            'project_id' => $projectId,
            'production_stage' => $stage->value,
            'item_ids' => $itemIds,
        ]);

        return $updated;
    }

    /**
     * @return list<ItemCategory>
     */
    public function categoriesForStage(ProductionStage $stage): array
    {
        return match ($stage) {
            ProductionStage::Cutting => [ItemCategory::AluminiumProfile],
            ProductionStage::Fabrication => [ItemCategory::Accessory, ItemCategory::Rubber],
            default => [],
        };
    }
}
