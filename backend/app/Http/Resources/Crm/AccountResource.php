<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_number' => $this->account_number,
            'name' => $this->name,
            'account_type' => $this->account_type,
            'industry' => $this->industry,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'kra_pin' => $this->kra_pin,
            'billing_address' => $this->billing_address,
            'physical_address' => $this->physical_address,
            'county_id' => $this->county_id,
            'status' => $this->status,
            'account_owner_id' => $this->account_owner_id,
            'primary_contact_id' => $this->primary_contact_id,
            'source_lead_id' => $this->source_lead_id,
            'owner_id' => $this->owner_id,
            'owner' => new UserResource($this->whenLoaded('owner')),
            'primary_contact' => new ContactResource($this->whenLoaded('primaryContact')),
            'contacts' => ContactResource::collection($this->whenLoaded('contacts')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
