<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AluminiumProfile extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'item_id';

    protected $fillable = [
        'item_id',
        'profile_family',
        'width_mm',
        'depth_mm',
        'finish',
        'weight_per_metre',
        'standard_bar_length_mm',
    ];

    protected function casts(): array
    {
        return [
            'width_mm' => 'decimal:2',
            'depth_mm' => 'decimal:2',
            'weight_per_metre' => 'decimal:4',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}
