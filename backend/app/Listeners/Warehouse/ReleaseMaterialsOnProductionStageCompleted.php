<?php

namespace App\Listeners\Warehouse;

use App\Events\Production\ProductionStageCompleted;

class ReleaseMaterialsOnProductionStageCompleted
{
    public function __construct() {}

    /**
     * Release on stage complete is disabled (PRODUCTION.MD §10 Option A).
     * Materials are released on production start-stage via MaterialReleaseRequestService.
     */
    public function handle(ProductionStageCompleted $event): void
    {
        // Intentionally no-op — avoids double-release with production start-stage flow.
    }
}
