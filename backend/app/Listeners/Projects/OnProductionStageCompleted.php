<?php

namespace App\Listeners\Projects;

use App\Enums\ProjectStage;
use App\Events\Production\ProductionStageCompleted;
use App\Models\Project;
use App\Services\Projects\ProjectStageService;

class OnProductionStageCompleted
{
    public function __construct(
        protected ProjectStageService $stages,
    ) {}

    public function handle(ProductionStageCompleted $event): void
    {
        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        $targetStage = match ($event->productionStage) {
            'cutting' => ProjectStage::CuttingStage,
            'fabrication', 'sash' => ProjectStage::FabricationStage,
            'glass_assembly' => ProjectStage::GlassAssembly,
            'qc_post_fabrication' => ProjectStage::QcPreInstallation,
            default => null,
        };

        if (! $targetStage instanceof ProjectStage) {
            return;
        }

        if ($this->stages->canTransition($project, $targetStage)) {
            $this->stages->transition($project, $targetStage, null, [
                'reason' => "production_stage:{$event->productionStage}",
            ]);
        }
    }
}
