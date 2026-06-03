<?php

namespace App\Listeners\Warehouse;

use App\Enums\Production\ProductionStage;
use App\Events\Production\ProductionStageCompleted;
use App\Services\Warehouse\Reservations\StageMaterialReleaseService;

class ReleaseMaterialsOnProductionStageCompleted
{
    public function __construct(
        protected StageMaterialReleaseService $stageRelease,
    ) {}

    public function handle(ProductionStageCompleted $event): void
    {
        $stage = ProductionStage::tryFrom($event->productionStage);

        if (! $stage) {
            return;
        }

        $this->stageRelease->releaseForStage($event->projectId, $stage);
    }
}
