<?php

namespace App\Services\Crm\Deals;

use App\Events\Crm\DealProjectCreated;
use App\Enums\Crm\DealStage;
use App\Enums\ProjectStage;
use App\Models\Deal;
use App\Models\Project;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Projects\ProjectActivationService;
use App\Services\Projects\ProjectDealSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DealToProjectService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected ProjectActivationService $projectActivation,
        protected ProjectDealSyncService $projectDealSync,
    ) {}

    public function createFromDeal(Deal $deal, User $user): array
    {
        $stage = $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage;

        if ($stage !== DealStage::Won->value && $deal->status !== 'won') {
            throw ValidationException::withMessages([
                'stage' => ['Deal must be won before creating a project.'],
            ]);
        }

        if ($deal->project_id) {
            throw ValidationException::withMessages([
                'project' => ['A project already exists for this deal.'],
            ]);
        }

        if (! $deal->account_id) {
            throw ValidationException::withMessages([
                'account_id' => ['Deal must be linked to an account before creating a project.'],
            ]);
        }

        return DB::transaction(function () use ($deal, $user) {
            $hasActiveProject = $this->projectActivation->accountHasActiveInFlightProject((int) $deal->account_id);
            $depositSatisfied = $this->projectDealSync->dealDepositSatisfied($deal);

            $isActive = ! $hasActiveProject;
            $projectStage = ($isActive && $depositSatisfied)
                ? ProjectStage::DepositReceived->value
                : ProjectStage::AwaitingDeposit->value;

            $stageData = [];
            $account = $deal->account;
            if ($account?->building_construction_stage_id) {
                $stageData['intake'] = [
                    'building_construction_stage_id' => $account->building_construction_stage_id,
                ];
            }

            $project = Project::query()->create([
                'reference' => 'PR-'.strtoupper(Str::random(8)),
                'name' => $deal->name ?? $deal->title,
                'deal_id' => $deal->id,
                'contact_id' => $deal->primary_contact_id ?? $deal->contact_id,
                'account_id' => $deal->account_id,
                'site_address' => $deal->site_address,
                'quoted_amount' => $deal->final_agreed_amount ?? $deal->estimated_value ?? $deal->amount,
                'deposit_received' => $this->projectDealSync->dealDepositPaid($deal),
                'sales_rep_id' => $deal->deal_owner_id ?? $deal->owner_id ?? $user->id,
                'stage' => $projectStage,
                'is_active' => $isActive,
                'stage_data' => $stageData !== [] ? $stageData : null,
            ]);

            $deal->update([
                'stage' => DealStage::ProjectCreated->value,
                'project_id' => $project->id,
            ]);

            $deal = $deal->fresh();

            if (! $isActive && $depositSatisfied) {
                $project = $this->projectActivation->tryActivateFromDeposit($project, $deal, $user);
            } elseif ($isActive && ! $depositSatisfied) {
                $project = $project->fresh();
            } else {
                $project = $this->projectDealSync->syncFromDeal($project, $user);
            }

            $this->crmAudit->dealProjectCreated($deal, [
                'project_id' => $project->id,
                'is_active' => $project->is_active,
            ], $user);

            DealProjectCreated::dispatch($deal, $project);

            return [
                'deal' => $deal->fresh()->load(['contact', 'account', 'owner', 'project']),
                'project' => $project,
            ];
        });
    }
}
