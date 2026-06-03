<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectDelay extends Model
{
    protected $fillable = [
        'project_id',
        'stage',
        'reason',
        'days_lost',
        'notes',
        'logged_by',
        'logged_at',
    ];

    protected function casts(): array
    {
        return [
            'days_lost' => 'integer',
            'logged_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function logger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
