<?php

namespace App\Http\Resources\Crm;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quotation_number' => $this->quotation_number,
            'project_name' => $this->project_name,
            'status' => $this->status?->value ?? $this->status,
            'revision_number' => $this->revision_number ?? 1,
            'revision_label' => $this->revisionLabel(),
            'pricing_currency' => $this->hasUsdPricing() ? 'USD' : 'KES',
            'total_amount' => $this->total_amount,
            'total_amount_kes' => $this->totalAmountKes(),
            'exchange_rate' => $this->hasUsdPricing() ? $this->usdToKesRate() : null,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'deal_id' => $this->deal_id,
            'project_id' => $this->whenLoaded('deal', fn () => $this->deal?->project_id),
        ];
    }
}
