<?php

namespace App\Http\Resources\Procurement;

use App\Models\Procurement\PurchaseOrderLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'supplier_id' => $this->supplier_id,
            'project_id' => $this->project_id,
            'requisition_id' => $this->requisition_id,
            'status' => $this->status?->value ?? $this->status,
            'is_editable' => $this->isEditable(),
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'total' => $this->total,
            'expected_delivery' => $this->expected_delivery?->toDateString(),
            'delivered_at' => $this->delivered_at?->toDateString(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'sent_at' => $this->sent_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'goods_receipts_count' => $this->when(
                isset($this->goods_receipts_count),
                fn () => (int) $this->goods_receipts_count,
            ),
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier ? [
                'id' => $this->supplier->id,
                'code' => $this->supplier->code,
                'name' => $this->supplier->name,
                'category' => $this->supplier->category,
                'email' => $this->supplier->email,
                'phone' => $this->supplier->phone,
                'address' => $this->supplier->address,
            ] : null),
            'project' => $this->whenLoaded('project', fn () => $this->project ? [
                'id' => $this->project->id,
                'reference' => $this->project->reference,
                'name' => $this->project->name,
            ] : null),
            'requisition' => $this->whenLoaded('requisition', fn () => $this->requisition ? [
                'id' => $this->requisition->id,
                'reference' => $this->requisition->reference,
            ] : null),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(
                fn (PurchaseOrderLine $line) => [
                    'id' => $line->id,
                    'warehouse_item_id' => $line->warehouse_item_id,
                    'description' => $line->description,
                    'sku' => $line->sku,
                    'quantity' => $line->quantity,
                    'unit_price' => $line->unit_price,
                    'line_total' => $line->line_total,
                    'received_qty' => $line->received_qty,
                ]
            )->values()),
            'transport_orders' => $this->whenLoaded('transportOrders', fn () => $this->transportOrders->map(
                fn ($order) => [
                    'id' => $order->id,
                    'transport_number' => $order->transport_number,
                    'transport_type' => $order->transport_type,
                    'vehicle' => $order->vehicle,
                    'driver_id' => $order->driver_id,
                    'driver_name' => $order->driver_name,
                    'driver_phone' => $order->driver_phone,
                    'expected_arrival' => $order->expected_arrival?->toDateString(),
                    'status' => $order->status,
                ]
            )->values()),
        ];
    }
}
