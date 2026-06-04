<?php

namespace App\Models\QualityControl;

use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcScheduleFrequency;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QcInspectionSchedule extends Model
{
    protected $fillable = [
        'name',
        'context',
        'frequency',
        'frequency_interval',
        'warehouse_deck_slug',
        'warehouse_section_id',
        'tool_scope',
        'assigned_role',
        'assigned_user_id',
        'template_id',
        'next_due_at',
        'last_run_at',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'context' => QcInspectionContext::class,
            'frequency' => QcScheduleFrequency::class,
            'next_due_at' => 'datetime',
            'last_run_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(QcChecklistTemplate::class, 'template_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
