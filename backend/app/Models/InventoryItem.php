<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'sku',
        'name',
        'category',
        'unit',
        'reorder_level',
        'quantity_on_hand',
        'quantity_reserved',
        'bin_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'reorder_level' => 'decimal:3',
            'quantity_on_hand' => 'decimal:3',
            'quantity_reserved' => 'decimal:3',
            'is_active' => 'boolean',
        ];
    }

    public function getAvailableQtyAttribute(): float
    {
        return (float) $this->quantity_on_hand - (float) $this->quantity_reserved;
    }
}
