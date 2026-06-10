<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeasuredOpening extends Model
{
    protected $fillable = [
        'site_visit_id', 'opening_code', 'opening_type', 'floor', 'room_area',
        'width_mm', 'height_mm', 'depth_mm', 'quantity', 'sill_height_mm',
        'wall_condition', 'frame_condition', 'product_type', 'glass_preference',
        'profile_preference', 'finish_colour', 'opening_direction', 'notes', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'width_mm' => 'decimal:2',
            'height_mm' => 'decimal:2',
            'depth_mm' => 'decimal:2',
            'sill_height_mm' => 'decimal:2',
            'quantity' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function siteVisit(): BelongsTo
    {
        return $this->belongsTo(SiteVisit::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(OpeningPhoto::class);
    }
}
