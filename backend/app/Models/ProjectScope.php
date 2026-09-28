<?php

namespace App\Models;

use App\Enums\Projects\ProjectScopeType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectScope extends Model
{
    protected $fillable = [
        'project_id',
        'project_wave_id',
        'parent_id',
        'project_floor_id',
        'type',
        'label',
        'room_key',
        'sort_order',
        'stage',
        'completion_percent',
        'openings_total',
        'openings_done',
    ];

    protected function casts(): array
    {
        return [
            'type' => ProjectScopeType::class,
            'sort_order' => 'integer',
            'completion_percent' => 'integer',
            'openings_total' => 'integer',
            'openings_done' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function wave(): BelongsTo
    {
        return $this->belongsTo(ProjectWave::class, 'project_wave_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order')->orderBy('id');
    }

    public function floor(): BelongsTo
    {
        return $this->belongsTo(ProjectFloor::class, 'project_floor_id');
    }
}
