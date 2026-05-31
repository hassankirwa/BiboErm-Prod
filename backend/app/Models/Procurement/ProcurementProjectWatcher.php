<?php

namespace App\Models\Procurement;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementProjectWatcher extends Model
{
    protected $fillable = [
        'project_id',
        'notify_at_stage',
        'notify_user_id',
        'is_active',
        'last_notified_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_notified_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function notifyUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'notify_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
