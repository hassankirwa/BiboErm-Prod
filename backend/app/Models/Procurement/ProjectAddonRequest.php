<?php

namespace App\Models\Procurement;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAddonRequest extends Model
{
    protected $fillable = [
        'project_id',
        'purchase_requisition_id',
        'description',
        'client_requested',
        'status',
        'requested_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'client_requested' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisition_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
