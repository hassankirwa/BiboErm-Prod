<?php

namespace App\Http\Resources\FieldInstallation;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FieldDeliveryRecordResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_id' => $this->job_id,
            'project_id' => $this->project_id,
            'transport_order_id' => $this->transport_order_id,
            'received_by' => $this->received_by,
            'received_at' => $this->received_at?->toIso8601String(),
            'delivery_condition' => $this->delivery_condition?->value ?? $this->delivery_condition,
            'vehicle_reg' => $this->vehicle_reg,
            'driver_name' => $this->driver_name,
            'packing_list_ref' => $this->packing_list_ref,
            'expected_units' => $this->expected_units,
            'received_units' => $this->received_units,
            'notes' => $this->notes,
            'lines' => FieldDeliveryLineResource::collection($this->whenLoaded('lines')),
        ];
    }
}
