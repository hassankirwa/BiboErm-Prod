<?php

namespace App\Models\Procurement;

use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrderLine extends Model
{
    protected $fillable = [
        'purchase_order_id',
        'warehouse_item_id',
        'description',
        'sku',
        'quantity',
        'unit_price',
        'line_total',
        'received_qty',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
            'received_qty' => 'decimal:3',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'warehouse_item_id');
    }

    public function goodsReceiptLines(): HasMany
    {
        return $this->hasMany(GoodsReceiptLine::class);
    }
}
