<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmCounty extends Model
{
    protected $table = 'crm_counties';

    protected $fillable = [
        'slug',
        'label',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
