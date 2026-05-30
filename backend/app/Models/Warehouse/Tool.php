<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\ToolCondition;
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
    ];

    protected function casts(): array
    {
        return [
            'condition' => ToolCondition::class,
            'purchase_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function issuances(): HasMany
    {
        return $this->hasMany(ToolIssuance::class, 'tool_id');
    }

    public function activeIssuance(): ?ToolIssuance
    {
        return $this->issuances()->whereNull('return_date')->latest('issue_date')->first();
    }
}
