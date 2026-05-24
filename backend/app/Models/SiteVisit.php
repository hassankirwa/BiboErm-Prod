<?php

namespace App\Models;

use App\Enums\Crm\SiteVisitStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SiteVisit extends Model
{
    protected $fillable = [
        'visit_number', 'title', 'lead_id', 'deal_id', 'account_id', 'contact_id',
        'site_address', 'latitude', 'longitude', 'assigned_field_officer_id', 'scheduled_by',
        'visit_date', 'visit_time', 'visit_purpose', 'status', 'notes_for_field_officer',
        'actual_latitude', 'actual_longitude', 'arrival_at', 'completion_at',
        'client_present', 'visit_outcome', 'follow_up_required', 'field_officer_notes',
        'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SiteVisitStatus::class,
            'visit_date' => 'date',
            'client_present' => 'boolean',
            'follow_up_required' => 'boolean',
            'arrival_at' => 'datetime',
            'completion_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function assignedFieldOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_field_officer_id');
    }

    public function scheduledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function measurementLines(): HasMany
    {
        return $this->hasMany(MeasurementLine::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(SiteVisitPhoto::class);
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->can('site_visits.view_all') || $user->can('crm.manage')) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('assigned_field_officer_id', $user->id)
                ->orWhere('scheduled_by', $user->id);
        });
    }
}
