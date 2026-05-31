<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoorTypeAccessory extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'door_type_id',
        'item_id',
        'standard_qty',
    ];

    protected function casts(): array
    {
        return [
            'standard_qty' => 'decimal:2',
        ];
    }

    public function doorType(): BelongsTo
    {
        return $this->belongsTo(DoorType::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
