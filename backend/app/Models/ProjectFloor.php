<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectFloor extends Model
{
    protected $fillable = [
        'project_id',
        'project_scope_id',
        'floor_label',
        'section_notes',
        'completion_percent',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'completion_percent' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function scope(): BelongsTo
    {
        return $this->belongsTo(ProjectScope::class, 'project_scope_id');
    }

    public function bomLines(): HasMany
    {
        return $this->hasMany(ProjectBomLine::class, 'floor_id');
    }
}
