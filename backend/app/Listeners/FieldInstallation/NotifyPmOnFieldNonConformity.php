<?php

namespace App\Listeners\FieldInstallation;

use App\Enums\FieldInstallation\NonConformitySeverity;
use App\Events\FieldInstallation\FieldNonConformityReported;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\Project;
use Illuminate\Support\Facades\Log;

class NotifyPmOnFieldNonConformity
{
    public function handle(FieldNonConformityReported $event): void
    {
        if ($event->severity !== NonConformitySeverity::Critical->value) {
            return;
        }

        $nc = FieldNonConformity::query()->find($event->nonConformityId);
        $project = Project::query()->find($event->projectId);

        if (! $nc || ! $project) {
            return;
        }

        Log::warning('Critical field non-conformity reported', [
            'non_conformity_id' => $event->nonConformityId,
            'job_id' => $event->jobId,
            'project_id' => $event->projectId,
            'project_manager_id' => $project->project_manager_id,
            'title' => $nc->title,
            'reported_by' => $event->reportedByUserId,
        ]);
    }
}
