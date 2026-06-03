<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\Warehouse\ProjectMaterialsReserved;
use App\Models\Project;
use App\Services\Projects\ProjectStageService;

class OnProjectMaterialsReserved
{
    public function __construct(
        protected ProjectStageService $stages,
    ) {}

    public function handle(ProjectMaterialsReserved $event): void
    {
        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        if ($this->stages->canTransition($project, ProjectStage::MaterialsReserved)) {
            $this->stages->transition($project, ProjectStage::MaterialsReserved, null, [
                'reason' => 'warehouse_materials_reserved',
            ]);
        }
    }
}
