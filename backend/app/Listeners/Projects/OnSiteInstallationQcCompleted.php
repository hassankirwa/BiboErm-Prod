<?php

namespace App\Listeners\Projects;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Events\QualityControl\QcInspectionCompleted;
use Illuminate\Support\Facades\Log;

/**
 * Site installation QC pass unlocks leaving site_qc (gated in ProjectStageService).
 * Fail keeps the project at site_qc with open defects — no stage change.
 */
class OnSiteInstallationQcCompleted
{
    public function handle(QcInspectionCompleted $event): void
    {
        if ($event->context !== QcInspectionContext::SiteInstallation->value) {
            return;
        }

        if (! in_array($event->result, [
            QcInspectionResult::Pass->value,
            QcInspectionResult::ConditionalPass->value,
        ], true)) {
            return;
        }

        Log::info('Site installation QC passed; project may advance from site_qc.', [
            'inspection_id' => $event->inspectionId,
            'project_id' => $event->projectId,
            'result' => $event->result,
        ]);
    }
}
