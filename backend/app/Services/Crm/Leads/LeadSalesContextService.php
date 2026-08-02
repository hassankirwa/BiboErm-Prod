<?php

namespace App\Services\Crm\Leads;

use App\Models\Account;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;

class LeadSalesContextService
{
    /**
     * Resolve quotation/deal context for this lead only.
     *
     * Returning-client leads share an account with prior opportunities; never
     * surface another lead's quote or deal just because the account matches.
     *
     * @return array{latest_quotation: Quotation|null, sales_deal: Deal|null}
     */
    public function resolve(Lead $lead): array
    {
        $salesDeal = $this->dealForLead($lead);

        if (! $salesDeal) {
            return ['latest_quotation' => null, 'sales_deal' => null];
        }

        $latestQuotation = Quotation::query()
            ->where('deal_id', $salesDeal->id)
            ->excludingReferenceCopies()
            ->with(['deal.project', 'lines'])
            ->latest('id')
            ->first();

        return [
            'latest_quotation' => $latestQuotation,
            'sales_deal' => $salesDeal->loadMissing('project'),
        ];
    }

    public function reconcileLeadDealLink(Lead $lead): void
    {
        if ($lead->converted_deal_id) {
            return;
        }

        $dealId = $this->findDealIdForLead($lead);

        if ($dealId) {
            $lead->update(['converted_deal_id' => $dealId]);
        }
    }

    protected function dealForLead(Lead $lead): ?Deal
    {
        if ($lead->converted_deal_id) {
            $linked = Deal::query()
                ->with('project')
                ->find($lead->converted_deal_id);

            if ($linked) {
                return $linked;
            }
        }

        $dealId = $this->findDealIdForLead($lead);

        return $dealId
            ? Deal::query()->with('project')->find($dealId)
            : null;
    }

    protected function findDealIdForLead(Lead $lead): ?int
    {
        $dealId = Deal::query()
            ->where(function ($query) use ($lead) {
                $query->where('source_lead_id', $lead->id)
                    ->orWhere('lead_id', $lead->id);
            })
            ->latest('id')
            ->value('id');

        if ($dealId) {
            return (int) $dealId;
        }

        // Legacy / first-opportunity only: account.source_lead_id is this lead.
        // Do not fall back for sibling leads on a returning client account.
        if (! $lead->converted_account_id) {
            return null;
        }

        $accountSourceLeadId = Account::query()
            ->whereKey($lead->converted_account_id)
            ->value('source_lead_id');

        if (! $accountSourceLeadId || (int) $accountSourceLeadId !== (int) $lead->id) {
            return null;
        }

        $dealId = Quotation::query()
            ->where('account_id', $lead->converted_account_id)
            ->whereNotNull('deal_id')
            ->excludingReferenceCopies()
            ->latest('id')
            ->value('deal_id');

        if (! $dealId) {
            $dealId = Deal::query()
                ->where('account_id', $lead->converted_account_id)
                ->latest('id')
                ->value('id');
        }

        return $dealId ? (int) $dealId : null;
    }
}
