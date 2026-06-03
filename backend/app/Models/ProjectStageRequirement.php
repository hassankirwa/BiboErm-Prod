<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectStageRequirement extends Model
{
    protected $fillable = [
        'stage',
        'required_documents',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'required_documents' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
