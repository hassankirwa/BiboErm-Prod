<?php

namespace App\Models\Procurement;

use App\Enums\Procurement\RequisitionTrigger;
use App\Models\ProjectBomLine;
use App\Models\Warehouse\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequisitionLine extends Model
{
    protected $fillable = [
        'purchase_requisition_id',
        'warehouse_item_id',
        'project_bom_line_id',
        'description',
        'sku',
        'quantity',
        'required_quantity',
        'unit_of_measure',
        'trigger_type',
        'estimated_unit_price',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'trigger_type' => RequisitionTrigger::class,
            'quantity' => 'decimal:3',
            'required_quantity' => 'decimal:3',
            'estimated_unit_price' => 'decimal:2',
        ];
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisition_id');
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'warehouse_item_id');
    }

    public function projectBomLine(): BelongsTo
    {
        return $this->belongsTo(ProjectBomLine::class, 'project_bom_line_id');
    }
}
