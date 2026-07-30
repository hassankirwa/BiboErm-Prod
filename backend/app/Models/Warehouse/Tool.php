<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolTrackingMode;
use App\Models\FieldInstallation\FieldToolAssignment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tool extends Model
{
    protected $table = 'warehouse_tools';

    protected $fillable = [
        'tool_code',
        'name',
        'tool_type',
        'condition',
        'purchase_date',
        'is_active',
        'tracking_mode',
        'total_qty',
        'qty_in_repair',
    ];

    protected function casts(): array
    {
        return [
            'condition' => ToolCondition::class,
            'tracking_mode' => ToolTrackingMode::class,
            'purchase_date' => 'date',
            'is_active' => 'boolean',
            'total_qty' => 'integer',
            'qty_in_repair' => 'integer',
        ];
    }

    public function issuances(): HasMany
    {
        return $this->hasMany(ToolIssuance::class, 'tool_id');
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(ToolIncident::class, 'tool_id');
    }

    public function openIssuances(): HasMany
    {
        return $this->issuances()->whereNull('return_date');
    }

    public function activeIssuance(): ?ToolIssuance
    {
        return $this->openIssuances()->latest('issue_date')->first();
    }

    public function isSerialized(): bool
    {
        return ($this->tracking_mode ?? ToolTrackingMode::Serialized)->isSerialized();
    }

    public function isQuantityTracked(): bool
    {
        return ($this->tracking_mode ?? ToolTrackingMode::Serialized)->isQuantity();
    }

    public function issuedQty(): int
    {
        return (int) $this->openIssuances()->sum('quantity');
    }

    public function availableQty(): int
    {
        if ($this->isSerialized()) {
            return $this->activeIssuance() ? 0 : 1;
        }

        return max(0, (int) $this->total_qty - $this->issuedQty() - (int) $this->qty_in_repair);
    }

    public function onSiteQty(): int
    {
        return (int) FieldToolAssignment::query()
            ->whereNull('returned_at')
            ->whereHas('toolIssuance', fn ($q) => $q->where('tool_id', $this->id)->whereNull('return_date'))
            ->join('tool_issuances', 'tool_issuances.id', '=', 'field_tool_assignments.tool_issuance_id')
            ->sum('tool_issuances.quantity');
    }
}
