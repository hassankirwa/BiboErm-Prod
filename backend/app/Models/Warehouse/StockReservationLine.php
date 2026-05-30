<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockReservationLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'reservation_id',
        'item_id',
        'bin_id',
        'quantity_reserved',
        'quantity_released',
        'bom_line_ref',
    ];

    protected function casts(): array
    {
        return [
            'quantity_reserved' => 'decimal:3',
            'quantity_released' => 'decimal:3',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(StockReservation::class, 'reservation_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'bin_id');
    }

    public function remainingQuantity(): string
    {
        return bcsub(
            (string) $this->quantity_reserved,
            (string) $this->quantity_released,
            3
        );
    }
}
