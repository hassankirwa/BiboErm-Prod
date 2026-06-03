<?php

namespace App\Models;

use App\Models\Warehouse\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectBomLine extends Model
{
    protected $fillable = [
        'bom_id',
        'line_type',
        'warehouse_item_id',
        'material_code',
        'material_name',
        'quantity',
        'measurement_mm',
        'is_procurement_only',
        'is_glass',
        'is_addon',
        'compatible_profile_code',
        'floor_id',
        'sort_order',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'measurement_mm' => 'integer',
            'is_procurement_only' => 'boolean',
            'is_glass' => 'boolean',
            'is_addon' => 'boolean',
        ];
    }

    public function bom(): BelongsTo
    {
        return $this->belongsTo(ProjectBom::class, 'bom_id');
    }

    public function floor(): BelongsTo
    {
        return $this->belongsTo(ProjectFloor::class, 'floor_id');
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'warehouse_item_id');
    }
}
