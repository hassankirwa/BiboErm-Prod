<?php

namespace App\Listeners\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\InstallMode;
use App\Enums\ProjectStage;
use App\Events\Projects\ProjectStageAdvanced;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Project;
use App\Models\User;
use App\Services\FieldInstallation\FieldInstallationJobService;
use Illuminate\Support\Facades\Log;

/**
 * Auto-create a field installation job when a project enters the installation stage
 * (outside / full-install path), if none is already active.
 */
class CreateFieldJobOnInstallationStage
{
    public function __construct(protected FieldInstallationJobService $fieldJobs) {}

    public function handle(ProjectStageAdvanced $event): void
    {
        if ($event->toStage !== ProjectStage::Installation->value) {
            return;
        }

        $project = Project::query()->find($event->projectId);
        if (! $project) {
            return;
        }

        $installMode = $project->install_mode instanceof InstallMode
            ? $project->install_mode
            : InstallMode::tryFrom((string) $project->install_mode);

        if ($installMode === InstallMode::NairobiFabricationOnly) {
            return;
        }

        $hasActive = FieldInstallationJob::query()
            ->where('project_id', $project->id)
            ->whereIn('status', [
                FieldJobStatus::Scheduled->value,
                FieldJobStatus::InProgress->value,
                FieldJobStatus::OnHold->value,
            ])
            ->exists();

        if ($hasActive) {
            return;
        }

        if (! $this->fieldJobs->canStartFieldInstallation($project, $installMode)) {
            return;
        }

        $actor = $event->changedByUserId
            ? User::query()->find($event->changedByUserId)
            : null;
        $actor ??= User::query()->first();

        if (! $actor) {
            return;
        }

        try {
            $this->fieldJobs->create($actor, [
                'project_id' => $project->id,
                'notes' => 'Auto-created when project entered installation stage.',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to auto-create field job on installation stage', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
