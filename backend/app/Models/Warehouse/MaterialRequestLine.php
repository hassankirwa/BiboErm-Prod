<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialRequestLine extends Model
{
    protected $table = 'warehouse_material_request_lines';

    protected $fillable = [
        'material_request_id',
        'warehouse_item_id',
        'quantity_requested',
        'quantity_fulfilled',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity_requested' => 'decimal:3',
            'quantity_fulfilled' => 'decimal:3',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class, 'material_request_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'warehouse_item_id');
    }
}
