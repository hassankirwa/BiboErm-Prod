<?php

namespace App\Listeners\FieldInstallation;

use App\Events\Production\ProductionStageCompleted;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Project;
use App\Models\User;
use App\Enums\FieldInstallation\FieldJobStatus;
use App\Services\FieldInstallation\FieldInstallationJobService;
use Illuminate\Support\Facades\Log;

/**
 * After sash fabrication completes, Nairobi projects are handed to the field team
 * for site installation while the factory order continues (glass assembly, etc.).
 */
class ForwardNairobiFieldOnSashComplete
{
    public function __construct(protected FieldInstallationJobService $fieldJobs) {}

    public function handle(ProductionStageCompleted $event): void
    {
        if ($event->productionStage !== 'sash') {
            return;
        }

        $project = Project::query()->find($event->projectId);
        if (! $project) {
            return;
        }

        if (! $this->fieldJobs->isNairobiEarlyEligible($project)) {
            return;
        }

        if (! $this->fieldJobs->canStartFieldInstallation($project)) {
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

        $actor = $event->completedByUserId
            ? User::query()->find($event->completedByUserId)
            : null;
        $actor ??= User::query()->first();

        if (! $actor) {
            return;
        }

        try {
            $this->fieldJobs->create($actor, [
                'project_id' => $project->id,
                'production_order_id' => $event->productionOrderId,
                'notes' => 'Auto-created after sash fabrication — Nairobi early site installation.',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Failed to auto-create Nairobi field job after sash', [
                'project_id' => $project->id,
                'production_order_id' => $event->productionOrderId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
