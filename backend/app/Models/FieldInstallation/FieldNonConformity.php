<?php

namespace App\Models\FieldInstallation;

use App\Enums\FieldInstallation\NonConformitySeverity;
use App\Enums\FieldInstallation\NonConformityStatus;
use App\Enums\FieldInstallation\NonConformityType;
use App\Models\Project;
use App\Models\ProjectBomLine;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldNonConformity extends Model
{
    protected $fillable = [
        'job_id',
        'field_installation_unit_id',
        'project_id',
        'delivery_record_id',
        'daily_log_id',
        'nc_type',
        'severity',
        'status',
        'title',
        'description',
        'project_bom_line_id',
        'warehouse_item_id',
        'qty_affected',
        'reported_by',
        'reported_at',
        'acknowledged_by',
        'acknowledged_at',
        'resolved_by',
        'resolved_at',
        'resolution_notes',
    ];

    protected function casts(): array
    {
        return [
            'nc_type' => NonConformityType::class,
            'severity' => NonConformitySeverity::class,
            'status' => NonConformityStatus::class,
            'qty_affected' => 'decimal:3',
            'reported_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationUnit::class, 'field_installation_unit_id');
    }

    public function fieldUnit(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationUnit::class, 'field_installation_unit_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function deliveryRecord(): BelongsTo
    {
        return $this->belongsTo(FieldDeliveryRecord::class, 'delivery_record_id');
    }

    public function dailyLog(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationDailyLog::class, 'daily_log_id');
    }

    public function bomLine(): BelongsTo
    {
        return $this->belongsTo(ProjectBomLine::class, 'project_bom_line_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
