<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_number' => $this->lead_number ?? $this->reference,
            'reference' => $this->reference,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'company' => $this->company,
            'lead_type_id' => $this->lead_type_id,
            'lead_source_id' => $this->lead_source_id,
            'lead_source' => $this->whenLoaded('leadSource', fn () => [
                'id' => $this->leadSource->id,
                'slug' => $this->leadSource->slug,
                'label' => $this->leadSource->label,
            ]),
            'status' => $this->status?->value ?? $this->status,
            'priority' => $this->priority,
            'phone' => $this->phone,
            'email' => $this->email,
            'contact_person_name' => $this->contact_person_name,
            'account_name' => $this->account_name,
            'product_interests' => \App\Support\JsonArray::normalize($this->product_interests),
            'estimated_budget' => $this->estimated_budget,
            'estimated_value' => $this->estimated_value,
            'need_site_visit' => $this->need_site_visit,
            'site_address' => $this->site_address,
            'county_id' => $this->county_id,
            'subcounty' => $this->subcounty,
            'ward' => $this->ward,
            'next_follow_up_at' => $this->next_follow_up_at?->toIso8601String(),
            'lead_owner_id' => $this->lead_owner_id,
            'assigned_sales_user_id' => $this->assigned_sales_user_id,
            'assigned_field_officer_id' => $this->assigned_field_officer_id,
            'assigned_to' => $this->assigned_to,
            'lead_owner' => new UserResource($this->whenLoaded('leadOwner')),
            'assigned_sales_user' => new UserResource($this->whenLoaded('assignedSalesUser')),
            'assigned_field_officer' => new UserResource($this->whenLoaded('assignedFieldOfficer')),
            'assignee' => new UserResource($this->whenLoaded('assignee')),
            'linked_contacts' => ContactResource::collection(
                $this->when(
                    $this->relationLoaded('sourceContacts')
                        || $this->relationLoaded('convertedContact'),
                    fn () => $this->resolveLinkedContacts(),
                ),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
