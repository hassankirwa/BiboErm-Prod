<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLevel extends Model
{
    public const UPDATED_AT = 'updated_at';

    public const CREATED_AT = null;

    protected $fillable = [
        'item_id',
        'bin_id',
        'quantity_on_hand',
        'quantity_reserved',
    ];

    protected function casts(): array
    {
        return [
            'quantity_on_hand' => 'decimal:3',
            'quantity_reserved' => 'decimal:3',
            'updated_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'bin_id');
    }

    public function availableQuantity(): string
    {
        return bcsub(
            (string) $this->quantity_on_hand,
            (string) $this->quantity_reserved,
            3
        );
    }
}
