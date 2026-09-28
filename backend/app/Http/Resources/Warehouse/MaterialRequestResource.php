<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaterialRequestResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'source' => $this->source?->value ?? $this->source,
            'status' => $this->status?->value ?? $this->status,
            'reason' => $this->reason,
            'notes' => $this->notes,
            'requested_by' => $this->requested_by,
            'fulfilled_by' => $this->fulfilled_by,
            'fulfilled_at' => $this->fulfilled_at?->toIso8601String(),
            'stock_movement_id' => $this->stock_movement_id,
            'purchase_requisition_id' => $this->purchase_requisition_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'project' => $this->whenLoaded('project', fn () => $this->project ? [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
                'stage' => $this->project->stage?->value ?? $this->project->stage,
            ] : null),
            'requester' => $this->whenLoaded('requester', fn () => $this->requester ? [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
            ] : null),
            'fulfiller' => $this->whenLoaded('fulfiller', fn () => $this->fulfiller ? [
                'id' => $this->fulfiller->id,
                'name' => $this->fulfiller->name,
            ] : null),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($line) => [
                'id' => $line->id,
                'warehouse_item_id' => $line->warehouse_item_id,
                'quantity_requested' => (string) $line->quantity_requested,
                'quantity_fulfilled' => (string) $line->quantity_fulfilled,
                'notes' => $line->notes,
                'item' => $line->relationLoaded('item') && $line->item ? [
                    'id' => $line->item->id,
                    'sku' => $line->item->sku,
                    'name' => $line->item->name,
                    'unit_of_measure' => $line->item->unit_of_measure,
                    'category' => $line->item->category?->value ?? $line->item->category,
                ] : null,
            ])->values()->all()),
            'purchase_requisition' => $this->whenLoaded('purchaseRequisition', fn () => $this->purchaseRequisition ? [
                'id' => $this->purchaseRequisition->id,
                'reference' => $this->purchaseRequisition->reference,
                'status' => $this->purchaseRequisition->status?->value ?? $this->purchaseRequisition->status,
            ] : null),
            'stock_movement' => $this->whenLoaded('stockMovement', fn () => $this->stockMovement ? [
                'id' => $this->stockMovement->id,
                'movement_number' => $this->stockMovement->movement_number,
            ] : null),
        ];
    }
}
