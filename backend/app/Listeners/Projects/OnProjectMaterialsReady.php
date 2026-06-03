<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Models\Project;
use App\Services\Projects\ProjectStageService;

class OnProjectMaterialsReady
{
    public function __construct(
        protected ProjectStageService $stages,
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

        if ($this->stages->canTransition($project, ProjectStage::MaterialsReady)) {
            $this->stages->transition($project, ProjectStage::MaterialsReady, null, [
                'reason' => 'warehouse_materials_ready',
            ]);
        }
    }
}
