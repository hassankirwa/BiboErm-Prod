<?php

namespace App\Listeners\QualityControl;

use App\Services\QualityControl\QcInspectionService;

/**
 * Auto-creates a site_installation inspection when field installation completes a job.
 * Register when FieldInstallationCompleted event is published by Field Installation module.
 */
class CreateSiteInspectionOnFieldJobComplete
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(int $projectId, int $fieldInstallationJobId): void
    {
        $this->inspections->createSiteInstallation($projectId, $fieldInstallationJobId);
    }
}
