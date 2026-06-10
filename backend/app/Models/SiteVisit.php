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
        'site_address', 'latitude', 'longitude', 'assigned_field_officer_id', 'assigned_to_user_id',
        'scheduled_by', 'created_by', 'visit_date', 'visit_time', 'visit_purpose', 'visit_type',
        'requires_measurements', 'status', 'notes_for_field_officer',
        'building_type', 'floor_level', 'room_area', 'site_condition', 'access_notes',
        'parking_security_notes', 'lift_stair_access', 'power_availability',
        'installation_access_notes', 'special_risks', 'general_notes',
        'actual_latitude', 'actual_longitude', 'gps_start', 'gps_end',
        'arrival_at', 'completion_at', 'submitted_at', 'reviewed_at',
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
            'requires_measurements' => 'boolean',
            'arrival_at' => 'datetime',
            'completion_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
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

    public function assignedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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

    public function measuredOpenings(): HasMany
    {
        return $this->hasMany(MeasuredOpening::class);
    }

    public function measurementReports(): HasMany
    {
        return $this->hasMany(MeasurementReport::class);
    }

    public function designJobs(): HasMany
    {
        return $this->hasMany(DesignJob::class);
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->can('site_visits.view_all')) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('assigned_field_officer_id', $user->id)
                ->orWhere('assigned_to_user_id', $user->id)
                ->orWhere('scheduled_by', $user->id)
                ->orWhereIn('lead_id', Lead::query()->visibleTo($user)->select('id'))
                ->orWhereIn('deal_id', Deal::query()->visibleTo($user)->select('id'));
        });
    }
}
