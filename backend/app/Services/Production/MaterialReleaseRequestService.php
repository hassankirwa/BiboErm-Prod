<?php

namespace App\Services\Production;

use App\Enums\Production\ProductionStage;
use App\Models\Production\ProductionMaterialRelease;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Warehouse\Reservations\StageMaterialReleaseService;
use Illuminate\Support\Facades\DB;

class MaterialReleaseRequestService
{
    public function __construct(
        protected StageMaterialReleaseService $stageRelease,
    ) {}

    public function releaseForStageStart(ProductionOrder $order, ProductionStage $stage, User $user): void
    {
        $warehouseStage = $stage->warehouseReleaseStage();

        if (! $warehouseStage) {
            return;
        }

        if ($this->alreadyReleasedForStage($order->id, $stage)) {
            return;
        }

        DB::transaction(function () use ($order, $stage, $warehouseStage, $user) {
            $reservation = StockReservation::query()
                ->where('project_id', $order->project_id)
                ->latest('id')
                ->first();

            if (! $reservation) {
                return;
            }

            $before = $this->releasedQuantitiesByLine($reservation->id);

            $result = $this->stageRelease->releaseForStage(
                projectId: $order->project_id,
                stage: $warehouseStage,
                performer: $user,
            );

            $reservation->refresh()->load('lines');

            foreach ($reservation->lines as $line) {
                $previous = $before[$line->id] ?? '0';
                $delta = bcsub((string) $line->quantity_released, $previous, 3);

                if (bccomp($delta, '0', 3) !== 1) {
                    continue;
                }

                ProductionMaterialRelease::query()->create([
                    'production_order_id' => $order->id,
                    'stock_reservation_line_id' => $line->id,
                    'stage' => $stage->value,
                    'qty_released' => $delta,
                    'released_at' => now(),
                    'released_by' => $user->id,
                    'stock_movement_id' => $result['movement_id'],
                    'created_at' => now(),
                ]);
            }
        });
    }

    private function alreadyReleasedForStage(int $productionOrderId, ProductionStage $stage): bool
    {
        return ProductionMaterialRelease::query()
            ->where('production_order_id', $productionOrderId)
            ->where('stage', $stage->value)
            ->exists();
    }

    /**
     * @return array<int, string>
     */
    private function releasedQuantitiesByLine(int $reservationId): array
    {
        return StockReservationLine::query()
            ->where('reservation_id', $reservationId)
            ->pluck('quantity_released', 'id')
            ->map(fn ($qty) => (string) $qty)
            ->all();
    }
}
