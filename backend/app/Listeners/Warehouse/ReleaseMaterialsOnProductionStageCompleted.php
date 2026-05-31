<?php

namespace App\Listeners\Warehouse;

use App\Events\Production\ProductionStageCompleted;
use App\Services\Warehouse\Reservations\StageMaterialReleaseService;

class ReleaseMaterialsOnProductionStageCompleted
{
    public function __construct(
        protected StageMaterialReleaseService $stageRelease,
    ) {}

    public function handle(ProductionStageCompleted $event): void
    {
        $this->stageRelease->releaseForStage($event->projectId, $event->stage);
    }
}
