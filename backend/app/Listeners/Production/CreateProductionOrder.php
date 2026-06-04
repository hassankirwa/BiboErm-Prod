<?php

namespace App\Listeners\Production;

use App\Events\Warehouse\ProjectMaterialsReady;
use App\Services\Production\ProductionOrderService;

class CreateProductionOrder
{
    public function __construct(
        protected ProductionOrderService $orders,
    ) {}

    public function handle(ProjectMaterialsReady $event): void
    {
        $this->orders->createFromMaterialsReady(
            projectId: $event->projectId,
            fifoSequence: $event->fifoSequence,
        );
    }
}
