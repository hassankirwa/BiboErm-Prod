<?php

namespace App\Http\Controllers\Warehouse\Reservations;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockReservationResource;
use App\Models\Warehouse\StockReservation;
use App\Services\Warehouse\Reservations\FifoReservationService;
use App\Services\Warehouse\Reservations\StageMaterialReleaseService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Http\Request;

class ReleaseReservedStockController extends Controller
{
    public function __construct(
        protected FifoReservationService $fifoReservation,
        protected StageMaterialReleaseService $stageRelease,
        protected WarehouseAuditLogger $audit,
    ) {}

    public function __invoke(Request $request, StockReservation $reservation): StockReservationResource
    {
        $data = $request->validate([
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['integer', 'exists:warehouse_items,id'],
            'production_stage' => ['nullable', 'string', 'in:cutting,fabrication'],
        ]);

        if ($stage = $data['production_stage'] ?? null) {
            $productionStage = \App\Enums\Production\ProductionStage::from($stage);
            $result = $this->stageRelease->releaseForStage(
                projectId: $reservation->project_id,
                stage: $productionStage,
                performer: $request->user(),
            );

            return new StockReservationResource(
                $result['reservation'] ?? $reservation->fresh(['lines.item', 'lines.bin', 'project'])
            );
        }

        $updated = $this->fifoReservation->release(
            reservation: $reservation,
            itemIds: $data['item_ids'] ?? null,
        );

        $this->audit->reservationReleased($updated->id, [
            'project_id' => $updated->project_id,
            'item_ids' => $data['item_ids'] ?? null,
        ]);

        return new StockReservationResource($updated);
    }
}
