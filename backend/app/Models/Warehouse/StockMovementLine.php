<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovementLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'stock_movement_id',
        'item_id',
        'from_bin_id',
        'to_bin_id',
        'quantity',
        'unit_cost',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_cost' => 'decimal:2',
        ];
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function fromBin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'from_bin_id');
    }

    public function toBin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'to_bin_id');
    }
}
