<?php

namespace App\Http\Resources\Procurement;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GlassOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'project_id' => $this->project_id,
            'supplier_id' => $this->supplier_id,
            'purchase_order_id' => $this->purchase_order_id,
            'purchase_requisition_id' => $this->purchase_requisition_id,
            'specs' => $this->specs ?? [],
            'status' => $this->status?->value ?? $this->status,
            'ordered_at' => $this->ordered_at?->toIso8601String(),
            'expected_delivery' => $this->expected_delivery?->toDateString(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'delivery_location' => $this->delivery_location,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'project' => $this->whenLoaded('project', fn () => $this->project ? [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
            ] : null),
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier ? [
                'id' => $this->supplier->id,
                'code' => $this->supplier->code,
                'name' => $this->supplier->name,
                'category' => $this->supplier->category,
            ] : null),
        ];
    }
}
