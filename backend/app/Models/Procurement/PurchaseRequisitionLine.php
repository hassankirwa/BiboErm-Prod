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
        'preferred_supplier_id',
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

    public function preferredSupplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'preferred_supplier_id');
    }

    /**
     * Effective supplier for PO grouping: line preferred, else requisition header.
     */
    public function effectiveSupplierId(?int $requisitionSupplierId = null): ?int
    {
        if ($this->preferred_supplier_id) {
            return (int) $this->preferred_supplier_id;
        }

        if ($requisitionSupplierId !== null) {
            return $requisitionSupplierId ?: null;
        }

        $headerId = $this->relationLoaded('requisition')
            ? $this->requisition?->supplier_id
            : $this->requisition()->value('supplier_id');

        return $headerId ? (int) $headerId : null;
    }
}
