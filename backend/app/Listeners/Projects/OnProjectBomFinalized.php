<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\Projects\ProjectBomFinalized;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectStageService;

class OnProjectBomFinalized
{
    public function __construct(
        protected ProjectStageService $stages,
    ) {}

    public function handle(ProjectBomFinalized $event): void
    {
        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        $currentStage = $this->stages->currentStage($project);
        if (! in_array($currentStage, [ProjectStage::BomFinalized, ProjectStage::MaterialCheck], true)) {
            return;
        }

        if (! $this->stages->canTransition($project, ProjectStage::MaterialCheck)) {
            return;
        }

        $actor = User::query()->find($event->finalizedByUserId);

        $this->stages->transition($project, ProjectStage::MaterialCheck, $actor, [
            'reason' => 'bom_stock_check_requested',
        ]);
    }
}
