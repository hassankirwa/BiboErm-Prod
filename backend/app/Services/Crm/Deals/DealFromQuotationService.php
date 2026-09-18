<?php

namespace App\Services\Crm\Deals;

use App\Enums\Crm\DealStage;
use App\Models\Account;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DealFromQuotationService
{
    public function createFromQuotation(Quotation $quotation, User $user): Deal
    {
        if ($quotation->deal_id) {
            return Deal::query()->findOrFail($quotation->deal_id);
        }

        $account = Account::query()->find($quotation->account_id);

        if (! $account) {
            throw ValidationException::withMessages([
                'account_id' => ['Quotation must be linked to an account before creating a deal.'],
            ]);
        }

        $title = $account->name.' — '.($quotation->quotation_number ?? 'Quotation');

        $kesTotal = $quotation->totalAmountKes();
        $sourceLeadId = $this->resolveSourceLeadId($quotation, $account);

        $deal = Deal::query()->create([
            'reference' => 'DL-'.strtoupper(Str::random(8)),
            'deal_number' => 'DL-'.strtoupper(Str::random(8)),
            'title' => $title,
            'name' => $title,
            'account_id' => $account->id,
            'contact_id' => $quotation->contact_id ?? $account->primary_contact_id,
            'primary_contact_id' => $quotation->contact_id ?? $account->primary_contact_id,
            'source_lead_id' => $sourceLeadId,
            'lead_id' => $sourceLeadId,
            'stage' => DealStage::QuotationSent->value,
            'status' => 'open',
            'amount' => $kesTotal,
            'estimated_value' => $kesTotal,
            'quotation_amount' => $kesTotal,
            'owner_id' => $account->account_owner_id ?? $user->id,
            'deal_owner_id' => $account->account_owner_id ?? $user->id,
            'created_by' => $user->id,
        ]);

        $quotation->update(['deal_id' => $deal->id]);

        if ($account->status === 'prospect') {
            $account->update(['status' => 'active_opportunity']);
        }

        if ($sourceLeadId) {
            Lead::query()
                ->whereKey($sourceLeadId)
                ->whereNull('converted_deal_id')
                ->update(['converted_deal_id' => $deal->id]);
        }

        return $deal->fresh();
    }

    protected function resolveSourceLeadId(Quotation $quotation, Account $account): ?int
    {
        $quotation->loadMissing('designJob');

        if ($quotation->designJob?->lead_id) {
            return (int) $quotation->designJob->lead_id;
        }

        return $account->source_lead_id ? (int) $account->source_lead_id : null;
    }
}
