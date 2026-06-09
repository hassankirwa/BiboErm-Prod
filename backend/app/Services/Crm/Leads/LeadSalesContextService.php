<?php

namespace App\Services\Crm\Leads;

use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;

class LeadSalesContextService
{
    /**
     * @return array{latest_quotation: Quotation|null, sales_deal: Deal|null}
     */
    public function resolve(Lead $lead): array
    {
        $accountId = $lead->converted_account_id;

        if (! $accountId) {
            return ['latest_quotation' => null, 'sales_deal' => null];
        }

        $latestQuotation = Quotation::query()
            ->where('account_id', $accountId)
            ->excludingReferenceCopies()
            ->with(['deal.project'])
            ->latest('id')
            ->first();

        $salesDeal = $latestQuotation?->deal;

        if (! $salesDeal) {
            $salesDeal = Deal::query()
                ->where('account_id', $accountId)
                ->with('project')
                ->latest('id')
                ->first();
        }

        return [
            'latest_quotation' => $latestQuotation,
            'sales_deal' => $salesDeal,
        ];
    }

    public function reconcileLeadDealLink(Lead $lead): void
    {
        if ($lead->converted_deal_id) {
            return;
        }

        $accountId = $lead->converted_account_id;

        if (! $accountId) {
            return;
        }

        $dealId = Quotation::query()
            ->where('account_id', $accountId)
            ->whereNotNull('deal_id')
            ->excludingReferenceCopies()
            ->latest('id')
            ->value('deal_id');

        if (! $dealId) {
            $dealId = Deal::query()
                ->where('account_id', $accountId)
                ->latest('id')
                ->value('id');
        }

        if ($dealId) {
            $lead->update(['converted_deal_id' => $dealId]);
        }
    }
}
