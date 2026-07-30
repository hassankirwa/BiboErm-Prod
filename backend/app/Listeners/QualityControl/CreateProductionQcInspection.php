<?php

namespace App\Listeners\QualityControl;

use App\Events\Production\ProductionStageCompleted;
use App\Services\QualityControl\QcInspectionService;

/**
 * Auto-create the mandatory post-fabrication QC inspection when finishing
 * completes (order enters qc_post_fabrication), or when that stage itself completes
 * as a safety net.
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
