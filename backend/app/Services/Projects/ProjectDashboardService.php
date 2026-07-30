<?php

namespace App\Services\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Support\ProjectStageLabels;

class ProjectDashboardService
{
    public function __construct(
        protected ProjectMaterialStatusService $materialStatus,
        protected ProjectFifoOrderService $fifoOrder,
    ) {}

    /**
     * @return list<string>
     */
    protected function materialStages(): array
    {
        return [
            ProjectStage::MaterialCheck->value,
            ProjectStage::MaterialsReserved->value,
            ProjectStage::AwaitingProcurement->value,
            ProjectStage::MaterialsReady->value,
            ProjectStage::MaterialsReleased->value,
        ];
    }

    protected function stageLabel(ProjectStage $stage): string
    {
        return ProjectStageLabels::for($stage);
    }

    /**
     * @return array<string, mixed>
     */
    protected function materialChipForProject(Project $project): array
    {
        $stage = $project->stage?->value ?? $project->stage;

        if (in_array($stage, $this->materialStages(), true)) {
            $status = $this->materialStatus->build($project);

            return [
                'status' => match (true) {
                    ($status['summary']['shortage_lines'] ?? 0) > 0 => 'shortage',
                    $stage === ProjectStage::MaterialsReserved->value => 'reserved',
                    $stage === ProjectStage::AwaitingProcurement->value => 'procurement',
                    $stage === ProjectStage::MaterialsReady->value => 'ready',
                    $stage === ProjectStage::MaterialsReleased->value => 'released',
                    default => 'checking',
                },
                'label' => match (true) {
                    $stage === ProjectStage::MaterialCheck->value => 'Checking stock availability',
                    ($status['summary']['shortage_lines'] ?? 0) > 0 => 'Material shortage',
                    $stage === ProjectStage::MaterialsReserved->value => 'Reserved — awaiting production',
                    $stage === ProjectStage::AwaitingProcurement->value => 'Awaiting procurement',
                    $stage === ProjectStage::MaterialsReady->value => 'Materials ready — release pending',
                    $stage === ProjectStage::MaterialsReleased->value => 'Staged for production pickup',
                    default => 'Material check',
                },
                'summary' => $status['summary'],
                'fifo_position' => $status['fifo_position'],
            ];
        }

        return [
            'status' => 'none',
            'label' => null,
            'summary' => null,
            'fifo_position' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapPipelineProject(Project $project): array
    {
        $material = $this->materialChipForProject($project);

        return [
            'id' => $project->id,
            'reference' => $project->reference,
            'name' => $project->name,
            'priority' => $project->priority,
            'fifo_order' => $this->fifoOrder->positionFor((int) $project->id),
            'stage' => $project->stage?->value ?? $project->stage,
            'completion_percent' => $project->completion_percent,
            'projected_start' => $project->projected_start?->toDateString(),
            'projected_end' => $project->projected_end?->toDateString(),
            'project_manager' => $project->projectManager ? [
                'id' => $project->projectManager->id,
                'name' => $project->projectManager->name,
            ] : null,
            'account' => $project->account ? [
                'id' => $project->account->id,
                'name' => $project->account->name,
            ] : null,
            'deal' => $project->deal ? [
                'id' => $project->deal->id,
                'name' => $project->deal->name ?? $project->deal->title ?? null,
                'reference' => $project->deal->reference ?? null,
            ] : null,
            'bom' => $project->latestBom ? [
                'id' => $project->latestBom->id,
                'version' => $project->latestBom->version,
                'status' => $project->latestBom->status,
            ] : null,
            'material' => $material,
        ];
    }
    /**
     * @return array<string, mixed>
     */
    public function summaryForVisibleProjects($query): array
    {
        $queuedStages = [
            ProjectStage::AwaitingDeposit->value,
            ProjectStage::DepositReceived->value,
            ProjectStage::SiteAssessment->value,
            ProjectStage::FinalDesignApproval->value,
            ProjectStage::BomFinalized->value,
            ProjectStage::MaterialCheck->value,
            ProjectStage::MaterialsReserved->value,
        ];

        $startedStages = [
            ProjectStage::MaterialsReady->value,
            ProjectStage::MaterialsReleased->value,
            ProjectStage::CuttingStage->value,
            ProjectStage::FabricationStage->value,
            ProjectStage::GlassAssembly->value,
            ProjectStage::QcPreInstallation->value,
            ProjectStage::InTransit->value,
            ProjectStage::Installation->value,
            ProjectStage::SiteQc->value,
            ProjectStage::Snagging->value,
        ];

        $base = clone $query;

        return [
            'total_projects' => (clone $base)->count(),
            'queued' => (clone $base)->whereIn('stage', $queuedStages)->count(),
            'awaiting_procurement' => (clone $base)->where('stage', ProjectStage::AwaitingProcurement->value)->count(),
            'started' => (clone $base)->whereIn('stage', $startedStages)->count(),
            'completed' => (clone $base)->where('stage', ProjectStage::ProjectComplete->value)->count(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function pipelineForVisibleProjects($query): array
    {
        $projects = (clone $query)
            ->with(['projectManager', 'deal', 'account', 'latestBom'])
            ->where('stage', '!=', ProjectStage::ProjectComplete->value)
            ->orderBy('updated_at', 'desc')
            ->get();

        return collect(ProjectStage::cases())
            ->filter(fn (ProjectStage $stage) => $stage !== ProjectStage::ProjectComplete)
            ->map(function (ProjectStage $stage) use ($projects) {
                $stageProjects = $projects
                    ->filter(fn (Project $project) => ($project->stage?->value ?? $project->stage) === $stage->value)
                    ->values();

                return [
                    'stage' => $stage->value,
                    'label' => $this->stageLabel($stage),
                    'count' => $stageProjects->count(),
                    'projects' => $stageProjects
                        ->map(fn (Project $project) => $this->mapPipelineProject($project))
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }
}
