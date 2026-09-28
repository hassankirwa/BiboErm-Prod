<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\QuotationStatus;
use App\Models\Account;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Projects\ProjectDealSyncService;

class LeadPipelineService
{
    /** Ordered forward stages (excludes cold/lost). */
    private const FORWARD_ORDER = [
        LeadPipelineStage::NewLead->value,
        LeadPipelineStage::ContactConfirmed->value,
        LeadPipelineStage::AccountProvisioned->value,
        LeadPipelineStage::SiteVisitRequired->value,
        LeadPipelineStage::SiteVisitAssigned->value,
        LeadPipelineStage::SiteVisitInProgress->value,
        LeadPipelineStage::MeasurementsSubmitted->value,
        LeadPipelineStage::MeasurementReview->value,
        LeadPipelineStage::DesignRequired->value,
        LeadPipelineStage::WincadInProgress->value,
        LeadPipelineStage::WincadUploaded->value,
        LeadPipelineStage::ReadyForQuotation->value,
        LeadPipelineStage::ProformaCreated->value,
        LeadPipelineStage::ProformaSent->value,
        LeadPipelineStage::ClientAccepted->value,
        LeadPipelineStage::AwaitingDeposit->value,
        LeadPipelineStage::DepositPaid->value,
        LeadPipelineStage::DealWon->value,
        LeadPipelineStage::ProjectCreated->value,
    ];

    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected ProjectDealSyncService $projectDealSync,
    ) {}

    public function updateStage(Lead $lead, LeadPipelineStage $stage, ?User $user = null): Lead
    {
        $current = $lead->pipeline_stage instanceof LeadPipelineStage
            ? $lead->pipeline_stage->value
            : (string) ($lead->pipeline_stage ?? '');

        if ($current === $stage->value) {
            return $lead;
        }

        $lead->update([
            'pipeline_stage' => $stage->value,
            'updated_by' => $user?->id ?? $lead->updated_by,
        ]);

        if ($user) {
            $this->crmAudit->leadPipelineStageChanged(
                $lead,
                ['pipeline_stage' => $current !== '' ? $current : null],
                ['pipeline_stage' => $stage->value],
                $user,
            );
        }

        return $lead->fresh();
    }

    /**
     * Advance only forward along the sales pipeline (never regress, never override cold/lost).
     */
    public function advanceTo(Lead $lead, LeadPipelineStage $stage, ?User $user = null): Lead
    {
        $current = $lead->pipeline_stage instanceof LeadPipelineStage
            ? $lead->pipeline_stage
            : LeadPipelineStage::tryFrom((string) ($lead->pipeline_stage ?? ''));

        if (in_array($current, [LeadPipelineStage::Cold, LeadPipelineStage::Lost], true)) {
            return $lead;
        }

        if ($current && ! $this->isAheadOf($stage, $current)) {
            return $lead;
        }

        return $this->updateStage($lead, $stage, $user);
    }

    public function resolveLeadForDeal(Deal $deal): ?Lead
    {
        if ($deal->source_lead_id) {
            return Lead::query()->find($deal->source_lead_id);
        }

        if ($deal->lead_id) {
            return Lead::query()->find($deal->lead_id);
        }

        $accountId = $deal->account_id;
        if (! $accountId) {
            return null;
        }

        $sourceLeadId = $deal->relationLoaded('account')
            ? $deal->account?->source_lead_id
            : Account::query()->whereKey($accountId)->value('source_lead_id');

        return $sourceLeadId ? Lead::query()->find($sourceLeadId) : null;
    }

    public function resolveLeadForQuotation(Quotation $quotation): ?Lead
    {
        $quotation->loadMissing('designJob');

        if ($quotation->designJob?->lead_id) {
            $lead = Lead::query()->find($quotation->designJob->lead_id);
            if ($lead) {
                return $lead;
            }
        }

        if ($quotation->deal_id) {
            $deal = $quotation->relationLoaded('deal')
                ? $quotation->deal
                : Deal::query()->find($quotation->deal_id);
            if ($deal) {
                $lead = $this->resolveLeadForDeal($deal);
                if ($lead) {
                    return $lead;
                }
            }
        }

        $accountId = $quotation->account_id;
        if (! $accountId) {
            return null;
        }

        $sourceLeadId = $quotation->relationLoaded('account')
            ? $quotation->account?->source_lead_id
            : Account::query()->whereKey($accountId)->value('source_lead_id');

        return $sourceLeadId ? Lead::query()->find($sourceLeadId) : null;
    }

    /**
     * Reconcile lead pipeline from linked deal / quotation reality (fixes stuck "ready_for_quotation").
     */
    public function syncFromSalesContext(Lead $lead, ?Deal $deal, ?Quotation $quotation = null, ?User $user = null): Lead
    {
        $target = $this->inferredStageFromSales($deal, $quotation);
        if ($target === null) {
            return $lead;
        }

        return $this->advanceTo($lead, $target, $user);
    }

    public function syncFromDeal(Deal $deal, ?User $user = null): ?Lead
    {
        $lead = $this->resolveLeadForDeal($deal);
        if (! $lead) {
            return null;
        }

        $quotation = $deal->relationLoaded('quotations')
            ? $deal->quotations
                ->filter(fn (Quotation $q): bool => ! ($q->is_reference_copy ?? false))
                ->sortByDesc('id')
                ->first()
            : Quotation::query()
                ->where('deal_id', $deal->id)
                ->excludingReferenceCopies()
                ->latest('id')
                ->first();

        return $this->syncFromSalesContext($lead, $deal, $quotation, $user);
    }

    protected function inferredStageFromSales(?Deal $deal, ?Quotation $quotation): ?LeadPipelineStage
    {
        if ($deal?->project_id) {
            return LeadPipelineStage::ProjectCreated;
        }

        $dealStage = $deal?->stage instanceof DealStage
            ? $deal->stage->value
            : (string) ($deal?->stage ?? '');

        if ($deal && ($deal->status === 'won' || $dealStage === DealStage::Won->value || $dealStage === DealStage::ProjectCreated->value)) {
            return LeadPipelineStage::DealWon;
        }

        if ($deal && $this->projectDealSync->dealDepositSatisfied($deal)) {
            return LeadPipelineStage::DepositPaid;
        }

        if ($deal && ((float) ($deal->deposit_paid_amount ?? $deal->deposit_amount ?? 0)) > 0) {
            return LeadPipelineStage::AwaitingDeposit;
        }

        $quoteStatus = $quotation?->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) ($quotation?->status ?? ''));

        if ($quoteStatus === QuotationStatus::Accepted) {
            return LeadPipelineStage::ClientAccepted;
        }

        if ($quoteStatus === QuotationStatus::Sent
            || $quoteStatus === QuotationStatus::RevisionRequested
            || ($quotation?->sent_at !== null)) {
            return LeadPipelineStage::ProformaSent;
        }

        if ($quotation !== null) {
            return LeadPipelineStage::ProformaCreated;
        }

        return null;
    }

    protected function isAheadOf(LeadPipelineStage $candidate, LeadPipelineStage $current): bool
    {
        $candidateIdx = array_search($candidate->value, self::FORWARD_ORDER, true);
        $currentIdx = array_search($current->value, self::FORWARD_ORDER, true);

        if ($candidateIdx === false) {
            return false;
        }

        if ($currentIdx === false) {
            return true;
        }

        return $candidateIdx > $currentIdx;
    }

    public function onContactConfirmed(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::ContactConfirmed, $user);
    }

    public function onAccountProvisioned(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::AccountProvisioned, $user);
    }

    public function onSiteVisitRequired(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::SiteVisitRequired, $user);
    }

    public function onSiteVisitAssigned(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::SiteVisitAssigned, $user);
    }

    public function onSiteVisitStarted(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::SiteVisitInProgress, $user);
    }

    public function onSiteVisitSubmitted(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::MeasurementsSubmitted, $user);
    }

    public function onSiteVisitInReview(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::MeasurementReview, $user);
    }

    public function onMeasurementApproved(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::DesignRequired, $user);
    }

    public function onDesignJobAssigned(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::WincadInProgress, $user);
    }

    public function onDesignFilesUploaded(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::WincadUploaded, $user);
    }

    public function onReadyForQuotation(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::ReadyForQuotation, $user);
    }

    public function onProformaCreated(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::ProformaCreated, $user);
    }

    public function onProformaSent(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::ProformaSent, $user);
    }

    public function onClientAccepted(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::ClientAccepted, $user);
    }

    public function onAwaitingDeposit(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::AwaitingDeposit, $user);
    }

    public function onDepositPaid(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::DepositPaid, $user);
    }

    public function onDealWon(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::DealWon, $user);
    }

    public function onProjectCreated(Lead $lead, User $user): Lead
    {
        return $this->advanceTo($lead, LeadPipelineStage::ProjectCreated, $user);
    }
}
