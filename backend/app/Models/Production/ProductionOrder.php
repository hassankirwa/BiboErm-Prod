<?php

namespace App\Models\Production;

use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrder extends Model
{
    protected $fillable = [
        'reference',
        'project_id',
        'status',
        'current_stage',
        'fifo_position',
        'scheduled_start',
        'scheduled_end',
        'actual_start',
        'actual_end',
        'assigned_team_lead',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start' => 'date',
            'scheduled_end' => 'date',
            'actual_start' => 'date',
            'actual_end' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
