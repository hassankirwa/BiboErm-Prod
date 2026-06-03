<?php

namespace App\Models\FieldInstallation;

use App\Models\ProjectBomLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldDeliveryLine extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'delivery_record_id',
        'project_bom_line_id',
        'warehouse_item_id',
        'description',
        'qty_expected',
        'qty_received',
        'unit',
        'condition_notes',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'qty_expected' => 'decimal:3',
            'qty_received' => 'decimal:3',
            'created_at' => 'datetime',
        ];
    }

    public function deliveryRecord(): BelongsTo
    {
        return $this->belongsTo(FieldDeliveryRecord::class, 'delivery_record_id');
    }

    public function bomLine(): BelongsTo
    {
        return $this->belongsTo(ProjectBomLine::class, 'project_bom_line_id');
    }
}
