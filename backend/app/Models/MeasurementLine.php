<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeasurementLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'site_visit_id', 'room_area_name', 'width', 'height', 'quantity',
        'material_preference', 'installation_notes', 'obstacles_notes',
        'client_comments', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'width' => 'decimal:2',
            'height' => 'decimal:2',
        ];
    }

    public function siteVisit(): BelongsTo
    {
        return $this->belongsTo(SiteVisit::class);
    }
}
