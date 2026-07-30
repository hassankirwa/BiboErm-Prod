<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\ToolIncidentStatus;
use App\Enums\Warehouse\ToolIncidentType;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ToolIncident extends Model
{
    protected $fillable = [
        'tool_id',
        'issuance_id',
        'field_job_id',
        'responsible_user_id',
        'reported_by',
        'type',
        'status',
        'notes',
        'resolution_notes',
        'quantity',
        'replacement_tool_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => ToolIncidentType::class,
            'status' => ToolIncidentStatus::class,
            'quantity' => 'integer',
        ];
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(Tool::class, 'tool_id');
    }

    public function issuance(): BelongsTo
    {
        return $this->belongsTo(ToolIssuance::class, 'issuance_id');
    }

    public function fieldJob(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'field_job_id');
    }

    public function responsibleUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function replacementTool(): BelongsTo
    {
        return $this->belongsTo(Tool::class, 'replacement_tool_id');
    }
}
