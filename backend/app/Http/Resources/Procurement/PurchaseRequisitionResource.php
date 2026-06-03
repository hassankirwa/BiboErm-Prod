<?php

namespace App\Http\Resources\Procurement;

use App\Models\Procurement\PurchaseRequisitionLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseRequisitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'project_id' => $this->project_id,
            'supplier_id' => $this->supplier_id,
            'status' => $this->status?->value ?? $this->status,
            'notes' => $this->notes,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
            'requested_by' => $this->requested_by,
            'approved_by' => $this->approved_by,
            'requires_admin_approval' => $this->requiresAdminApproval(),
            'trigger_type' => $this->primaryTrigger()?->value,
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project?->id,
                'reference' => $this->project?->reference,
                'name' => $this->project?->name,
                'stage' => $this->project?->stage?->value ?? $this->project?->stage,
            ]),
            'requester' => $this->whenLoaded('requester', fn () => [
                'id' => $this->requester?->id,
                'name' => $this->requester?->name,
                'email' => $this->requester?->email,
            ]),
            'approver' => $this->whenLoaded('approver', fn () => [
                'id' => $this->approver?->id,
                'name' => $this->approver?->name,
                'email' => $this->approver?->email,
            ]),
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier ? [
                'id' => $this->supplier->id,
                'code' => $this->supplier->code,
                'name' => $this->supplier->name,
                'category' => $this->supplier->category,
            ] : null),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(
                fn (PurchaseRequisitionLine $line) => [
                    'id' => $line->id,
                    'description' => $line->description,
                    'quantity' => $line->quantity,
                    'required_quantity' => $line->required_quantity,
                    'overage_quantity' => $line->required_quantity !== null
                        && bccomp((string) $line->quantity, (string) $line->required_quantity, 3) === 1
                        ? bcsub((string) $line->quantity, (string) $line->required_quantity, 3)
                        : null,
                    'trigger_type' => $line->trigger_type?->value ?? $line->trigger_type,
                    'warehouse_item_id' => $line->warehouse_item_id,
                    'project_bom_line_id' => $line->project_bom_line_id,
                    'unit_of_measure' => $line->unit_of_measure,
                    'sku' => $line->sku,
                    'estimated_unit_price' => $line->estimated_unit_price,
                    'notes' => $line->notes,
                    'warehouse_item' => $line->relationLoaded('warehouseItem') ? [
                        'id' => $line->warehouseItem?->id,
                        'sku' => $line->warehouseItem?->sku,
                        'name' => $line->warehouseItem?->name,
                        'unit_of_measure' => $line->warehouseItem?->unit_of_measure,
                    ] : null,
                ]
            )->values()),
            'purchase_orders_count' => $this->when(
                $this->relationLoaded('purchaseOrders') || isset($this->purchase_orders_count),
                fn () => $this->relationLoaded('purchaseOrders')
                    ? $this->purchaseOrders->count()
                    : (int) ($this->purchase_orders_count ?? 0),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
