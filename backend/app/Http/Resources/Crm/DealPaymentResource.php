<?php

namespace App\Http\Resources\Crm;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DealPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deal_id' => $this->deal_id,
            'quotation_id' => $this->quotation_id,
            'payment_reference' => $this->payment_reference,
            'payment_date' => $this->payment_date?->toDateString(),
            'amount_paid' => $this->amount_paid,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'received_by' => $this->received_by,
            'receiver' => new UserResource($this->whenLoaded('receivedBy')),
            'proof_file_path' => $this->proof_file_path,
            'proof_firebase_url' => $this->proof_firebase_url,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
