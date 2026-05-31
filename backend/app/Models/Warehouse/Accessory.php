<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Accessory extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'item_id';

    protected $fillable = [
        'item_id',
        'door_type_id',
        'default_bin_id',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function doorType(): BelongsTo
    {
        return $this->belongsTo(DoorType::class);
    }

    public function defaultBin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'default_bin_id');
    }
}
