<?php

namespace App\Services\Projects;

use App\Enums\ProjectStage;
use App\Models\Deal;
use App\Models\Project;
use App\Models\User;
use App\Services\Crm\Payments\DealPaymentService;

class ProjectActivationService
{
    public function __construct(
        protected ProjectStageService $stages,
        protected ProjectDealSyncService $projectDealSync,
    ) {}

    public function tryActivateFromDeposit(Project $project, Deal $deal, ?User $actor = null): Project
    {
        $project = $project->fresh();

        if ($project->is_active) {
            return $this->projectDealSync->syncFromDeal($project, $actor);
        }

        if (! $this->projectDealSync->dealDepositSatisfied($deal)) {
            return $project;
        }

        $project->forceFill(['is_active' => true])->save();

        if ($this->currentStage($project) === ProjectStage::AwaitingDeposit->value) {
            $project = $this->stages->transition(
                $project,
                ProjectStage::DepositReceived,
                $actor,
                ['reason' => 'deposit_payment_activation'],
            );
        }

        return $project->fresh();
    }

    public function accountHasActiveInFlightProject(int $accountId, ?int $excludeProjectId = null): bool
    {
        return Project::query()
            ->where('account_id', $accountId)
            ->where('is_active', true)
            ->where('stage', '!=', ProjectStage::ProjectComplete->value)
            ->when($excludeProjectId, fn ($q) => $q->where('id', '!=', $excludeProjectId))
            ->exists();
    }

    protected function currentStage(Project $project): string
    {
        return $project->stage instanceof ProjectStage
            ? $project->stage->value
            : (string) $project->stage;
    }
}
