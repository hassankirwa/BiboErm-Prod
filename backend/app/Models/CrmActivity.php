<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CrmActivity extends Model
{
    protected $table = 'crm_activities';

    protected $fillable = [
        'type', 'activity_type', 'subject', 'body', 'description', 'status', 'priority',
        'due_at', 'scheduled_start_at', 'scheduled_end_at', 'completed_at', 'cancelled_at',
        'lead_id', 'contact_id', 'deal_id', 'account_id', 'site_visit_id',
        'location', 'reminder_minutes_before', 'outcome', 'duration_minutes', 'recipient',
        'activitable_type', 'activitable_id', 'assigned_to', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'scheduled_start_at' => 'datetime',
            'scheduled_end_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function activitable(): MorphTo
    {
        return $this->morphTo();
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
