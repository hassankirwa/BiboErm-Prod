<?php

namespace App\Models\FieldInstallation;

use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Models\ProjectBomLine;
use App\Models\ProjectFloor;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldInstallationUnit extends Model
{
    protected $fillable = [
        'job_id',
        'project_bom_line_id',
        'project_floor_id',
        'unit_label',
        'status',
        'installed_at',
        'installed_by',
        'snag_notes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'status' => FieldUnitStatus::class,
            'installed_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function bomLine(): BelongsTo
    {
        return $this->belongsTo(ProjectBomLine::class, 'project_bom_line_id');
    }

    public function floor(): BelongsTo
    {
        return $this->belongsTo(ProjectFloor::class, 'project_floor_id');
    }

    public function installedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'installed_by');
    }

    public function isComplete(): bool
    {
        return in_array($this->status, [FieldUnitStatus::Installed, FieldUnitStatus::Waived], true);
    }
}
