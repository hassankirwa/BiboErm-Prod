<?php

namespace App\Listeners\QualityControl;

use App\Events\FieldInstallation\FieldInstallationCompleted;
use App\Services\QualityControl\QcInspectionService;

/**
 * Auto-creates a site_installation inspection when field installation completes a job.
 */
class CreateSiteInspectionOnFieldJobComplete
{
    public function __construct(
        protected QcInspectionService $inspections,
    ) {}

    public function handle(FieldInstallationCompleted $event): void
    {
        $this->inspections->createSiteInstallation($event->projectId, $event->jobId);
    }
}
