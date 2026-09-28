<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialReleaseBatchLine extends Model
{
    protected $table = 'warehouse_material_release_batch_lines';

    protected $fillable = [
        'batch_id',
        'stock_reservation_line_id',
        'item_id',
        'bin_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MaterialReleaseBatch::class, 'batch_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'bin_id');
    }

    public function reservationLine(): BelongsTo
    {
        return $this->belongsTo(StockReservationLine::class, 'stock_reservation_line_id');
    }
}
