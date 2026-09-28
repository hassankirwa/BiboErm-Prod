<?php

namespace App\Listeners\QualityControl;

use App\Events\Production\ProductionStageCompleted;
use App\Services\QualityControl\QcInspectionService;

/**
 * Soft-auto-create per-opening stage QC when a production stage completes
 * (cutting → finishing in-process; finishing also seeds post-fab).
 */
class CreateProductionQcInspection
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(ProductionStageCompleted $event): void
    {
        $this->inspections->createFromProductionStage(
            $event->projectId,
            $event->productionOrderId,
            $event->productionStage,
        );
    }
}
