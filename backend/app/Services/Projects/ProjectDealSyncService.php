<?php

namespace App\Services\Projects;

use App\Enums\Crm\DealStage;
use App\Enums\ProjectStage;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\Project;
use App\Models\User;

class ProjectDealSyncService
{
    public function __construct(
        protected ProjectStageService $stages,
    ) {}

    public function syncFromDeal(Project $project, ?User $actor = null): Project
    {
        $project = $project->fresh();
        if (! $project->deal_id) {
            return $project;
        }

        $deal = Deal::query()->find($project->deal_id);
        if (! $deal) {
            return $project;
        }

        $paid = $this->dealDepositPaid($deal);
        $quoted = $deal->final_agreed_amount ?? $deal->quotation_amount ?? $deal->estimated_value ?? $deal->amount;
        $depositToRecord = $this->resolveDepositReceivedAmount($deal, $paid);

        $updates = [];
        if ($quoted !== null && ($project->quoted_amount === null || (float) $project->quoted_amount <= 0)) {
            $updates['quoted_amount'] = $quoted;
        }
        if (
            $depositToRecord > 0
            && ((float) ($project->deposit_received ?? 0) < $depositToRecord)
        ) {
            $updates['deposit_received'] = $depositToRecord;
        }

        if ($updates !== []) {
            $project->forceFill($updates)->save();
            $project = $project->fresh();
        }

        if (
            $this->dealDepositSatisfied($deal, $paid)
            && $this->currentProjectStage($project) === ProjectStage::AwaitingDeposit->value
        ) {
            $project = $this->stages->transition(
                $project,
                ProjectStage::DepositReceived,
                $actor,
                ['reason' => 'crm_deposit_sync']
            );
        }

        return $project->fresh();
    }

    public function dealDepositSatisfied(Deal $deal, ?float $paid = null): bool
    {
        $paid ??= $this->dealDepositPaid($deal);
        $required = (float) ($deal->deposit_required_amount ?? 0);
        $stage = $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage;

        if ($deal->payment_status === 'deposit_met') {
            return true;
        }

        // CRM already confirmed deposit or completed handoff to projects.
        if (in_array($stage, [
            DealStage::DepositRecorded->value,
            DealStage::ProjectCreated->value,
        ], true)) {
            return true;
        }

        if ($required > 0) {
            return $paid >= $required;
        }

        if ($paid > 0 && in_array($stage, [DealStage::Won->value], true)) {
            return true;
        }

        return $paid > 0;
    }

    protected function resolveDepositReceivedAmount(Deal $deal, float $paid): float
    {
        if ($paid > 0) {
            return $paid;
        }

        $required = (float) ($deal->deposit_required_amount ?? 0);
        $stage = $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage;

        if (
            $required > 0
            && in_array($stage, [
                DealStage::DepositRecorded->value,
                DealStage::ProjectCreated->value,
            ], true)
        ) {
            return $required;
        }

        return 0;
    }

    public function dealDepositPaid(Deal $deal): float
    {
        $fromDeal = (float) ($deal->deposit_paid_amount ?? 0);
        $fromPayments = (float) DealPayment::query()
            ->where('deal_id', $deal->id)
            ->sum('amount_paid');

        return max($fromDeal, $fromPayments);
    }

    protected function currentProjectStage(Project $project): string
    {
        return $project->stage instanceof ProjectStage
            ? $project->stage->value
            : (string) $project->stage;
    }
}
