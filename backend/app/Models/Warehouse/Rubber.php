<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rubber extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'item_id';

    protected $fillable = [
        'item_id',
        'compatible_profile_ids',
        'default_section_id',
    ];

    protected function casts(): array
    {
        return [
            'compatible_profile_ids' => 'array',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function defaultSection(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'default_section_id');
    }
}
