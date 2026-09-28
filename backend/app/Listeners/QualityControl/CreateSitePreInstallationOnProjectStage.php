<?php

namespace App\Listeners\QualityControl;

use App\Enums\ProjectStage;
use App\Events\Projects\ProjectStageAdvanced;
use App\Services\QualityControl\QcInspectionService;

/**
 * Auto-create per-opening site pre-installation QC when the project enters
 * qc_pre_installation.
 */
class CreateSitePreInstallationOnProjectStage
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(ProjectStageAdvanced $event): void
    {
        if ($event->toStage !== ProjectStage::QcPreInstallation->value) {
            return;
        }

        $this->inspections->createSitePreInstallation($event->projectId);
    }
}
