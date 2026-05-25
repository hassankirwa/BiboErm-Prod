<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'quotation_id', 'description', 'quantity', 'unit_price', 'line_total',
        'measurement_line_id', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
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
