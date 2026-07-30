<?php

namespace App\Models\Projects;

use App\Enums\Projects\ProjectDispatchStatus;
use App\Models\Procurement\Driver;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectDispatch extends Model
{
    protected $fillable = [
        'project_id',
        'driver_id',
        'status',
        'vehicle_reg',
        'vehicle_details',
        'dispatched_at',
        'delivered_at',
        'packing_notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => ProjectDispatchStatus::class,
            'dispatched_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [
            ProjectDispatchStatus::Scheduled,
            ProjectDispatchStatus::InTransit,
        ], true);
    }
}
