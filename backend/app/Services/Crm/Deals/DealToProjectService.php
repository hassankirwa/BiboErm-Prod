<?php

namespace App\Services\Crm\Deals;

use App\Events\Crm\DealProjectCreated;
use App\Enums\Crm\DealStage;
use App\Enums\ProjectStage;
use App\Models\Deal;
use App\Models\Project;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DealToProjectService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
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

        return DB::transaction(function () use ($deal, $user) {
            $project = Project::query()->create([
                'reference' => 'PR-'.strtoupper(Str::random(8)),
                'name' => $deal->name ?? $deal->title,
                'deal_id' => $deal->id,
                'contact_id' => $deal->primary_contact_id ?? $deal->contact_id,
                'account_id' => $deal->account_id,
                'site_address' => $deal->site_address,
                'quoted_amount' => $deal->final_agreed_amount ?? $deal->estimated_value ?? $deal->amount,
                'deposit_received' => $deal->deposit_paid_amount ?? $deal->deposit_amount,
                'sales_rep_id' => $deal->deal_owner_id ?? $deal->owner_id ?? $user->id,
                'stage' => ProjectStage::AwaitingDeposit->value,
            ]);

            $deal->update([
                'stage' => DealStage::ProjectCreated->value,
                'project_id' => $project->id,
            ]);

            $deal = $deal->fresh();

            $this->crmAudit->dealProjectCreated($deal, [
                'project_id' => $project->id,
            ], $user);

            DealProjectCreated::dispatch($deal, $project);

            return [
                'deal' => $deal->fresh()->load(['contact', 'account', 'owner', 'project']),
                'project' => $project,
            ];
        });
    }
}
