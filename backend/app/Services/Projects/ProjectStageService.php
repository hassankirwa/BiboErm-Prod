<?php

namespace App\Services\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Models\ProjectStageLog;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectStageService
{
    /**
     * @var list<ProjectStage>
     */
    private const ORDERED_STAGES = [
        ProjectStage::AwaitingDeposit,
        ProjectStage::DepositReceived,
        ProjectStage::SiteAssessment,
        ProjectStage::FinalDesignApproval,
        ProjectStage::BomFinalized,
        ProjectStage::MaterialCheck,
        ProjectStage::MaterialsReserved,
        ProjectStage::AwaitingProcurement,
        ProjectStage::MaterialsReady,
        ProjectStage::MaterialsReleased,
        ProjectStage::CuttingStage,
        ProjectStage::FabricationStage,
        ProjectStage::GlassAssembly,
        ProjectStage::QcPreInstallation,
        ProjectStage::InTransit,
        ProjectStage::Installation,
        ProjectStage::SiteQc,
        ProjectStage::Snagging,
        ProjectStage::ProjectComplete,
    ];

    public function __construct(
        protected OwenAuditLogger $audit,
    ) {}

    public function initialize(Project $project, ?User $actor = null, array $context = []): Project
    {
        if ($project->stageLogs()->exists()) {
            return $project->fresh();
        }

        return DB::transaction(function () use ($project, $actor, $context) {
            $stage = $this->currentStage($project);

            $project->forceFill([
                'completion_percent' => $this->completionPercentFor($stage),
            ])->save();

            ProjectStageLog::query()->create([
                'project_id' => $project->id,
                'from_stage' => null,
                'to_stage' => $stage->value,
                'delay_reason' => $context['reason'] ?? null,
                'changed_by' => $actor?->id,
                'changed_at' => now(),
            ]);

            $this->audit->log(
                module: 'projects',
                action: 'project.stage_initialized',
                entityType: class_basename($project),
                entityId: $project->id,
                newValues: ['stage' => $stage->value]
            );

            return $project->fresh(['stageLogs']);
        });
    }

    public function transition(Project $project, ProjectStage $toStage, ?User $actor = null, array $context = []): Project
    {
        $project = $project->fresh();
        $fromStage = $this->currentStage($project);

        if ($fromStage === $toStage) {
            return $project;
        }

        $force = (bool) ($context['force'] ?? false);

        if (! $force && ! $this->canTransition($project, $toStage)) {
            throw ValidationException::withMessages([
                'stage' => ["Cannot transition project from {$fromStage->value} to {$toStage->value}."],
            ]);
        }

        return DB::transaction(function () use ($project, $fromStage, $toStage, $actor, $context) {
            $updates = [
                'stage' => $toStage->value,
                'completion_percent' => $this->completionPercentFor($toStage),
                'actual_start' => $this->resolveActualStart($project, $toStage),
                'actual_end' => $toStage === ProjectStage::ProjectComplete ? now()->toDateString() : $project->actual_end,
            ];

            if (! empty($context['stage_data']) && is_array($context['stage_data'])) {
                $existing = is_array($project->stage_data) ? $project->stage_data : [];
                $incoming = $context['stage_data'];

                if (
                    isset($incoming['site_assessment'])
                    && is_array($incoming['site_assessment'])
                    && isset($existing['site_assessment'])
                    && is_array($existing['site_assessment'])
                ) {
                    $incoming['site_assessment'] = array_merge(
                        $existing['site_assessment'],
                        $incoming['site_assessment'],
                    );
                }

                $updates['stage_data'] = array_merge($existing, $incoming);
            }

            $project->forceFill($updates)->save();

            ProjectStageLog::query()->create([
                'project_id' => $project->id,
                'from_stage' => $fromStage->value,
                'to_stage' => $toStage->value,
                'delay_reason' => $context['reason'] ?? $context['delay_reason'] ?? null,
                'changed_by' => $actor?->id,
                'changed_at' => now(),
            ]);

            $this->audit->log(
                module: 'projects',
                action: 'project.stage_changed',
                entityType: class_basename($project),
                entityId: $project->id,
                oldValues: ['stage' => $fromStage->value],
                newValues: [
                    'stage' => $toStage->value,
                    'reason' => $context['reason'] ?? $context['delay_reason'] ?? null,
                    'force' => $context['force'] ?? false,
                ]
            );

            return $project->fresh(['stageLogs']);
        });
    }

    public function advance(Project $project, ProjectStage $stage, ?string $reason = null, ?int $userId = null): Project
    {
        $actor = $userId ? User::query()->find($userId) : null;

        return $this->transition($project, $stage, $actor, ['reason' => $reason]);
    }

    public function canTransition(Project $project, ProjectStage $toStage): bool
    {
        $current = $this->currentStage($project);
        $allowed = $this->allowedTransitionsFor($project, $current);

        return in_array($toStage, $allowed, true);
    }

    public function canAdvance(Project $project, ProjectStage $target): bool
    {
        return $this->canTransition($project, $target);
    }

    public function isSalesAdvanceTransition(ProjectStage $fromStage, ProjectStage $toStage): bool
    {
        return match (true) {
            $fromStage === ProjectStage::AwaitingDeposit && $toStage === ProjectStage::DepositReceived => true,
            $fromStage === ProjectStage::DepositReceived && $toStage === ProjectStage::SiteAssessment => true,
            $fromStage === ProjectStage::SiteAssessment && $toStage === ProjectStage::FinalDesignApproval => true,
            default => false,
        };
    }

    public function currentStage(Project $project): ProjectStage
    {
        return $project->stage instanceof ProjectStage
            ? $project->stage
            : ProjectStage::from((string) $project->stage);
    }

    public function current(Project $project): ProjectStage
    {
        return $this->currentStage($project);
    }

    /**
     * @return list<ProjectStage>
     */
    protected function allowedTransitionsFor(Project $project, ProjectStage $fromStage): array
    {
        $map = [
            ProjectStage::AwaitingDeposit->value => [ProjectStage::DepositReceived],
            ProjectStage::DepositReceived->value => [ProjectStage::SiteAssessment],
            ProjectStage::SiteAssessment->value => [ProjectStage::FinalDesignApproval],
            ProjectStage::FinalDesignApproval->value => [ProjectStage::BomFinalized],
            ProjectStage::BomFinalized->value => [ProjectStage::MaterialCheck],
            ProjectStage::MaterialCheck->value => [ProjectStage::MaterialsReserved, ProjectStage::AwaitingProcurement],
            ProjectStage::MaterialsReserved->value => [ProjectStage::MaterialsReady, ProjectStage::AwaitingProcurement],
            ProjectStage::AwaitingProcurement->value => [ProjectStage::MaterialsReady],
            ProjectStage::MaterialsReady->value => [ProjectStage::MaterialsReleased],
            ProjectStage::MaterialsReleased->value => [ProjectStage::CuttingStage],
            ProjectStage::CuttingStage->value => [ProjectStage::FabricationStage],
            ProjectStage::FabricationStage->value => [ProjectStage::GlassAssembly],
            ProjectStage::GlassAssembly->value => [ProjectStage::QcPreInstallation, ProjectStage::Snagging],
            ProjectStage::QcPreInstallation->value => [ProjectStage::InTransit, ProjectStage::Snagging],
            ProjectStage::InTransit->value => [ProjectStage::Installation],
            ProjectStage::Installation->value => [ProjectStage::SiteQc, ProjectStage::Snagging],
            ProjectStage::SiteQc->value => [ProjectStage::Snagging, ProjectStage::ProjectComplete],
            ProjectStage::Snagging->value => [ProjectStage::ProjectComplete],
            ProjectStage::ProjectComplete->value => [],
        ];

        return $map[$fromStage->value] ?? [];
    }

    protected function resolveActualStart(Project $project, ProjectStage $toStage): ?string
    {
        if ($project->actual_start) {
            return $project->actual_start->toDateString();
        }

        $depositIndex = $this->stageIndex(ProjectStage::DepositReceived);
        $targetIndex = $this->stageIndex($toStage);

        if ($targetIndex > $depositIndex) {
            return now()->toDateString();
        }

        return null;
    }

    protected function completionPercentFor(ProjectStage $stage): int
    {
        $index = $this->stageIndex($stage) + 1;

        return (int) floor(($index / count(self::ORDERED_STAGES)) * 100);
    }

    protected function stageIndex(ProjectStage $stage): int
    {
        foreach (self::ORDERED_STAGES as $index => $candidate) {
            if ($candidate === $stage) {
                return $index;
            }
        }

        return 0;
    }
}
