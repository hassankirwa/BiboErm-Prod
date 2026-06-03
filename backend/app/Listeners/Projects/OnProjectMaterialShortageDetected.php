<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Models\Project;
use App\Models\ProjectDelay;
use App\Services\Projects\ProjectStageService;

class OnProjectMaterialShortageDetected
{
    public function __construct(
        protected ProjectStageService $stages,
    ) {}

    public function handle(ProjectMaterialShortageDetected $event): void
    {
        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        $current = $this->stages->currentStage($project);

        if (! in_array($current, [ProjectStage::MaterialCheck, ProjectStage::MaterialsReserved], true)) {
            return;
        }

        if ($this->stages->canTransition($project, ProjectStage::AwaitingProcurement)) {
            $this->stages->transition($project, ProjectStage::AwaitingProcurement, null, [
                'reason' => 'warehouse_shortage_detected',
            ]);
        }

        if (config('bibo.pm.log_procurement_delay_on_shortage', true)) {
            ProjectDelay::query()->create([
                'project_id' => $project->id,
                'stage' => ProjectStage::AwaitingProcurement->value,
                'reason' => 'procurement',
                'days_lost' => 0,
                'notes' => 'Warehouse shortage detected. Procurement follow-up required.',
                'logged_at' => now(),
            ]);
        }
    }
}
