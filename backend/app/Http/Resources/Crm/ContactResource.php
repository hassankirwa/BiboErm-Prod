<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'contact_number' => $this->contact_number,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'whatsapp' => $this->whatsapp,
            'job_title' => $this->job_title,
            'preferred_contact_method' => $this->preferred_contact_method,
            'status' => $this->status,
            'account_id' => $this->account_id,
            'contact_owner_id' => $this->contact_owner_id,
            'source_lead_id' => $this->source_lead_id,
            'notes' => $this->notes,
            'owner_id' => $this->owner_id,
            'account' => new AccountResource($this->whenLoaded('account')),
            'owner' => new UserResource($this->whenLoaded('owner')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
