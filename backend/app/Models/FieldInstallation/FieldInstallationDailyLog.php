<?php

namespace App\Models\FieldInstallation;

use App\Enums\FieldInstallation\FieldPhotoAttachableType;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FieldInstallationDailyLog extends Model
{
    protected $fillable = [
        'job_id',
        'log_date',
        'submitted_by',
        'summary',
        'units_completed',
        'percent_today',
        'weather',
        'site_conditions',
        'blockers',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'log_date' => 'date',
            'percent_today' => 'decimal:2',
            'submitted_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(FieldInstallationPhoto::class, 'attachable_id')
            ->where('attachable_type', FieldPhotoAttachableType::DailyLog->value);
    }
}
