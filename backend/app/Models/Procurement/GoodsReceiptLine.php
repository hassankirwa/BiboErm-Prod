<?php

namespace App\Models\Procurement;

use App\Models\InventoryItem;
use App\Models\WarehouseBin;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptLine extends Model
{
    protected $fillable = [
        'goods_receipt_id',
        'purchase_order_line_id',
        'warehouse_item_id',
        'qty_received',
        'qty_accepted',
        'qty_rejected',
        'rejection_reason',
        'to_bin_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'qty_received' => 'decimal:3',
            'qty_accepted' => 'decimal:3',
            'qty_rejected' => 'decimal:3',
        ];
    }

    public function goodsReceipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class);
    }

    public function purchaseOrderLine(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderLine::class);
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'warehouse_item_id');
    }

    public function toBin(): BelongsTo
    {
        return $this->belongsTo(WarehouseBin::class, 'to_bin_id');
    }
}
