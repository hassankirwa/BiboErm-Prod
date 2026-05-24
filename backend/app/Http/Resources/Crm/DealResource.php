<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DealResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deal_number' => $this->deal_number ?? $this->reference,
            'reference' => $this->reference,
            'name' => $this->name ?? $this->title,
            'title' => $this->title,
            'account_id' => $this->account_id,
            'contact_id' => $this->contact_id,
            'primary_contact_id' => $this->primary_contact_id,
            'lead_id' => $this->lead_id,
            'source_lead_id' => $this->source_lead_id,
            'stage' => $this->stage,
            'status' => $this->status,
            'amount' => $this->amount,
            'estimated_value' => $this->estimated_value,
            'quotation_amount' => $this->quotation_amount,
            'final_agreed_amount' => $this->final_agreed_amount,
            'deposit_required_amount' => $this->deposit_required_amount,
            'deposit_required_percent' => $this->deposit_required_percent,
            'deposit_paid_amount' => $this->deposit_paid_amount,
            'deposit_amount' => $this->deposit_amount,
            'payment_status' => $this->payment_status,
            'expected_close_date' => $this->expected_close_date?->toDateString(),
            'expected_installation_date' => $this->expected_installation_date?->toDateString(),
            'product_interests' => \App\Support\JsonArray::normalize($this->product_interests),
            'requirement_summary' => $this->requirement_summary,
            'site_address' => $this->site_address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'probability' => $this->probability,
            'discount_requested' => $this->discount_requested,
            'loss_reason_id' => $this->loss_reason_id,
            'loss_notes' => $this->loss_notes,
            'lost_reason' => $this->lost_reason,
            'project_id' => $this->project_id,
            'won_at' => $this->won_at,
            'lost_at' => $this->lost_at,
            'owner_id' => $this->owner_id,
            'deal_owner_id' => $this->deal_owner_id,
            'assigned_field_officer_id' => $this->assigned_field_officer_id,
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'account' => new AccountResource($this->whenLoaded('account')),
            'owner' => new UserResource($this->whenLoaded('owner')),
            'project' => $this->whenLoaded('project'),
            'quotations' => QuotationResource::collection($this->whenLoaded('quotations')),
            'payments' => DealPaymentResource::collection($this->whenLoaded('payments')),
            'site_visits' => SiteVisitResource::collection($this->whenLoaded('siteVisits')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
