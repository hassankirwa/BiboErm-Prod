<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class WorkspaceCalendarEvent extends Model
{
    protected $fillable = [
        'title',
        'description',
        'event_type',
        'starts_at',
        'ends_at',
        'assigned_to',
        'created_by',
        'location',
        'visibility',
        'activitable_type',
        'activitable_id',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activitable(): MorphTo
    {
        return $this->morphTo();
    }
}
