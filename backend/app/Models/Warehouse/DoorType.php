<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DoorType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'section_code',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function standardAccessories(): HasMany
    {
        return $this->hasMany(DoorTypeAccessory::class);
    }
}
