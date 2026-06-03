<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\FieldInstallation\FieldInstallationCompleted;
use App\Models\Project;
use App\Models\User;
use App\Services\Projects\ProjectStageService;

class OnFieldInstallationCompleted
{
    public function __construct(
        protected ProjectStageService $projectStages,
    ) {}

    public function handle(FieldInstallationCompleted $event): void
    {
        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        $actor = User::query()->find($event->completedByUserId);

        if ($this->projectStages->currentStage($project) === ProjectStage::SiteQc) {
            return;
        }

        $this->projectStages->transition(
            $project,
            ProjectStage::SiteQc,
            $actor,
            ['reason' => 'Field installation completed', 'force' => true],
        );
    }
}
