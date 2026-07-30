<?php

namespace App\Models\Procurement;

use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlassPriceRecord extends Model
{
    protected $fillable = [
        'glass_order_id',
        'project_id',
        'supplier_id',
        'pane_index',
        'pane_name',
        'glass_type',
        'tint',
        'width_mm',
        'height_mm',
        'quantity',
        'area_m2',
        'buying_price',
        'price_per_sqm',
        'currency',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'pane_index' => 'integer',
            'width_mm' => 'float',
            'height_mm' => 'float',
            'quantity' => 'float',
            'area_m2' => 'float',
            'buying_price' => 'float',
            'price_per_sqm' => 'float',
            'recorded_at' => 'datetime',
        ];
    }

    public function glassOrder(): BelongsTo
    {
        return $this->belongsTo(GlassOrder::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
