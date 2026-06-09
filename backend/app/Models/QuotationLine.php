<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'quotation_id', 'description', 'series', 'code', 'glass_type',
        'width_mm', 'height_mm', 'sqm_per_pcs', 'total_sqm',
        'quantity', 'unit_price', 'line_total',
        'measurement_line_id', 'sort_order', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
            'width_mm' => 'decimal:2',
            'height_mm' => 'decimal:2',
            'sqm_per_pcs' => 'decimal:4',
            'total_sqm' => 'decimal:4',
            'metadata' => 'array',
        ];
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function measurementLine(): BelongsTo
    {
        return $this->belongsTo(MeasurementLine::class);
    }
}
