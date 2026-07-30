<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemAlias extends Model
{
    protected $table = 'warehouse_item_aliases';

    protected $fillable = [
        'warehouse_item_id',
        'source_system',
        'source_code',
        'source_name',
        'series',
        'line_type',
        'confidence',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'confidence' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'warehouse_item_id');
    }
}
