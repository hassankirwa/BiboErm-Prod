<?php

namespace App\Models\QualityControl;

use App\Enums\QualityControl\QcDefectSeverity;
use App\Enums\QualityControl\QcDefectStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QcDefect extends Model
{
    protected $fillable = [
        'inspection_id',
        'checklist_key',
        'severity',
        'description',
        'status',
        'reported_by',
        'photo_paths',
        'resolution_notes',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'severity' => QcDefectSeverity::class,
            'status' => QcDefectStatus::class,
            'photo_paths' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(QcInspection::class, 'inspection_id');
    }

    public function reportedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(QcInspectionPhoto::class, 'defect_id');
    }

    public function isCritical(): bool
    {
        return $this->severity === QcDefectSeverity::Critical;
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [QcDefectStatus::Open, QcDefectStatus::InProgress], true);
    }
}
