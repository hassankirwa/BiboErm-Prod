<?php

namespace App\Models\Production;

use App\Enums\Production\ProductionStage;
use App\Models\User;
use App\Models\Warehouse\StockReservationLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionMaterialRelease extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'production_order_id',
        'stock_reservation_line_id',
        'stage',
        'qty_released',
        'released_at',
        'released_by',
        'stock_movement_id',
        'notes',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'stage' => ProductionStage::class,
            'qty_released' => 'decimal:3',
            'released_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function reservationLine(): BelongsTo
    {
        return $this->belongsTo(StockReservationLine::class, 'stock_reservation_line_id');
    }

    public function releasedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }
}
