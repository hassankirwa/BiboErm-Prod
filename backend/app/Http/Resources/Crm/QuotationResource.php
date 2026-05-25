<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quotation_number' => $this->quotation_number,
            'deal_id' => $this->deal_id,
            'account_id' => $this->account_id,
            'contact_id' => $this->contact_id,
            'prepared_by' => $this->prepared_by,
            'status' => $this->status?->value ?? $this->status,
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_amount' => $this->tax_amount,
            'total_amount' => $this->total_amount,
            'valid_until' => $this->valid_until?->toDateString(),
            'terms_conditions' => $this->terms_conditions,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'revision_of_id' => $this->revision_of_id,
            'deal' => new DealResource($this->whenLoaded('deal')),
            'account' => new AccountResource($this->whenLoaded('account')),
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'prepared_by_user' => new UserResource($this->whenLoaded('preparedBy')),
            'lines' => $this->whenLoaded('lines'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
