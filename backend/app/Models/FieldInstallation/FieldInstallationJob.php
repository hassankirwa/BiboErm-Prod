<?php

namespace App\Models\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\FieldInstallation\FieldJobType;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FieldInstallationJob extends Model
{
    protected $fillable = [
        'reference',
        'project_id',
        'project_wave_id',
        'production_order_id',
        'job_type',
        'status',
        'team_lead_id',
        'scheduled_start',
        'scheduled_end',
        'actual_start',
        'actual_end',
        'percent_complete',
        'site_address',
        'site_contact_name',
        'site_contact_phone',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'job_type' => FieldJobType::class,
            'status' => FieldJobStatus::class,
            'scheduled_start' => 'date',
            'scheduled_end' => 'date',
            'actual_start' => 'datetime',
            'actual_end' => 'datetime',
            'percent_complete' => 'decimal:2',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function wave(): BelongsTo
    {
        return $this->belongsTo(\App\Models\ProjectWave::class, 'project_wave_id');
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function teamLead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_lead_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(FieldInstallationJobMember::class, 'job_id');
    }

    public function activeMembers(): HasMany
    {
        return $this->members()->whereNull('removed_at');
    }

    public function dailyLogs(): HasMany
    {
        return $this->hasMany(FieldInstallationDailyLog::class, 'job_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(FieldInstallationPhoto::class, 'job_id');
    }

    public function deliveryRecords(): HasMany
    {
        return $this->hasMany(FieldDeliveryRecord::class, 'job_id');
    }

    public function nonConformities(): HasMany
    {
        return $this->hasMany(FieldNonConformity::class, 'job_id');
    }

    public function units(): HasMany
    {
        return $this->hasMany(FieldInstallationUnit::class, 'job_id')->orderBy('sort_order');
    }

    public function toolAssignments(): HasMany
    {
        return $this->hasMany(FieldToolAssignment::class, 'job_id');
    }

    public function isActive(): bool
    {
        return $this->status instanceof FieldJobStatus
            ? $this->status->isActive()
            : FieldJobStatus::tryFrom((string) $this->status)?->isActive() ?? false;
    }
}
