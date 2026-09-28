<?php

namespace App\Models;

use App\Enums\Projects\ProjectWaveStatus;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Production\ProductionOrder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectWave extends Model
{
    protected $fillable = [
        'project_id',
        'wave_number',
        'label',
        'status',
        'completion_percent',
        'stage',
    ];

    protected function casts(): array
    {
        return [
            'wave_number' => 'integer',
            'status' => ProjectWaveStatus::class,
            'completion_percent' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function scopes(): HasMany
    {
        return $this->hasMany(ProjectScope::class)->orderBy('sort_order')->orderBy('id');
    }

    public function floorScopes(): HasMany
    {
        return $this->scopes()->where('type', 'floor');
    }

    public function productionOrders(): HasMany
    {
        return $this->hasMany(ProductionOrder::class);
    }

    public function fieldJobs(): HasMany
    {
        return $this->hasMany(FieldInstallationJob::class);
    }
}
