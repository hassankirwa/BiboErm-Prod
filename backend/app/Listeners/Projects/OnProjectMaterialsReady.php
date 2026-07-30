<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Models\Project;
use App\Services\Projects\ProjectMaterialStatusService;
use App\Services\Projects\ProjectStageService;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class OnProjectMaterialsReady
{
    public function __construct(
        protected ProjectStageService $stages,
        protected ProjectMaterialStatusService $materialStatus,
    ) {}

    public function handle(ProjectMaterialsReady $event): void
    {
        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        $current = $this->stages->currentStage($project);

        if (! in_array($current, [ProjectStage::MaterialsReserved, ProjectStage::AwaitingProcurement], true)) {
            return;
        }

        try {
            $this->materialStatus->assertCanAdvanceToMaterialsReady($project);
        } catch (ValidationException $exception) {
            Log::warning('Skipped materials_ready auto-advance: materials gate failed.', [
                'project_id' => $project->id,
                'errors' => $exception->errors(),
            ]);

            return;
        }

        if ($this->stages->canTransition($project, ProjectStage::MaterialsReady)) {
            $this->stages->transition($project, ProjectStage::MaterialsReady, null, [
                'reason' => 'warehouse_materials_ready',
            ]);
        }
    }
}
