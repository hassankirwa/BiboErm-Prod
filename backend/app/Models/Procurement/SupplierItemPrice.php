<?php

namespace App\Models\Procurement;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierItemPrice extends Model
{
    protected $fillable = [
        'supplier_id',
        'warehouse_item_id',
        'unit_price',
        'currency',
        'effective_from',
        'effective_to',
        'is_current',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_current' => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'warehouse_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
