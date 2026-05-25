<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmLeadType extends Model
{
    protected $table = 'crm_lead_types';

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
