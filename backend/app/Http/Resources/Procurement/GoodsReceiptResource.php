<?php

namespace App\Http\Resources\Procurement;

use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoodsReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grn_number' => $this->grn_number,
            'purchase_order_id' => $this->purchase_order_id,
            'project_id' => $this->project_id,
            'transport_order_id' => $this->transport_order_id,
            'status' => $this->status instanceof \BackedEnum ? $this->status->value : $this->status,
            'received_at' => $this->received_at?->toIso8601String(),
            'verified_at' => $this->verified_at?->toIso8601String(),
            'verified_by' => $this->verified_by,
            'notes' => $this->notes,
            'quality_inspection_notes' => $this->quality_inspection_notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toIso8601String(),
            'lines' => $this->whenLoaded('lines', fn () => $this->lines->map(fn ($line) => [
                'id' => $line->id,
                'goods_receipt_id' => $line->goods_receipt_id,
                'purchase_order_line_id' => $line->purchase_order_line_id,
                'warehouse_item_id' => $line->warehouse_item_id,
                'warehouse_item_category' => $line->warehouseItem?->category?->value ?? $line->warehouseItem?->category,
                'is_procurement_only' => (bool) ($line->is_procurement_only ?? false),
                'qty_received' => $line->qty_received,
                'qty_accepted' => $line->qty_accepted,
                'qty_rejected' => $line->qty_rejected,
                'rejection_reason' => $line->rejection_reason,
                'to_bin_id' => $line->to_bin_id,
                'notes' => $line->notes,
            ])),
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'goods_receipt_id' => $attachment->goods_receipt_id,
                'type' => $attachment->type instanceof \BackedEnum ? $attachment->type->value : $attachment->type,
                'path' => $attachment->path,
                'url' => BiboStorage::resolvePrivateApiUrl($attachment->path),
                'original_filename' => $attachment->original_filename,
                'uploaded_at' => $attachment->uploaded_at?->toIso8601String(),
            ])),
            'purchaseOrder' => $this->whenLoaded('purchaseOrder', fn () => new PurchaseOrderResource($this->purchaseOrder)),
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ] : null),
        ];
    }
}
