<?php

namespace App\Models\Production;

use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CuttingSheet extends Model
{
    protected $fillable = [
        'production_order_id',
        'project_bom_line_id',
        'warehouse_item_id',
        'profile_code',
        'cut_length_mm',
        'pieces',
        'bar_length_mm',
        'waste_mm',
        'sort_order',
        'generated_at',
        'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'cut_length_mm' => 'integer',
            'pieces' => 'integer',
            'bar_length_mm' => 'integer',
            'waste_mm' => 'integer',
            'sort_order' => 'integer',
            'generated_at' => 'datetime',
        ];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function bomLine(): BelongsTo
    {
        return $this->belongsTo(ProjectBomLine::class, 'project_bom_line_id');
    }

    public function warehouseItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'warehouse_item_id');
    }

    public function generatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
