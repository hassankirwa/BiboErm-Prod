<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\SectionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Section extends Model
{
    protected $table = 'warehouse_sections';

    protected $fillable = [
        'deck_id',
        'door_type_id',
        'code',
        'name',
        'section_type',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'section_type' => SectionType::class,
            'is_active' => 'boolean',
        ];
    }

    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class, 'deck_id');
    }

    public function doorType(): BelongsTo
    {
        return $this->belongsTo(DoorType::class);
    }

    public function bins(): HasMany
    {
        return $this->hasMany(Bin::class, 'section_id')->orderBy('sort_order');
    }
}
