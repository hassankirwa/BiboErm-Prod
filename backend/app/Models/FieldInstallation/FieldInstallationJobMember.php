<?php

namespace App\Models\FieldInstallation;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FieldInstallationJobMember extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'job_id',
        'user_id',
        'role',
        'assigned_at',
        'assigned_by',
        'removed_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'removed_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(FieldInstallationJob::class, 'job_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
