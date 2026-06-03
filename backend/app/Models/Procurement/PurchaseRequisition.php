<?php

namespace App\Models\Procurement;

use App\Enums\Procurement\RequisitionTrigger;
use App\Enums\Procurement\RequisitionStatus;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseRequisition extends Model
{
    protected $fillable = [
        'reference',
        'project_id',
        'supplier_id',
        'status',
        'notes',
        'requested_by',
        'submitted_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => RequisitionStatus::class,
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PurchaseRequisitionLine::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'requisition_id');
    }

    public function primaryTrigger(): ?RequisitionTrigger
    {
        $line = $this->relationLoaded('lines')
            ? $this->lines->first()
            : $this->lines()->first();

        if (! $line) {
            return null;
        }

        return $line->trigger_type instanceof RequisitionTrigger
            ? $line->trigger_type
            : RequisitionTrigger::tryFrom((string) $line->trigger_type);
    }

    public function requiresAdminApproval(): bool
    {
        return in_array($this->primaryTrigger(), [
            RequisitionTrigger::LowStock,
            RequisitionTrigger::ProjectMaterial,
        ], true);
    }
}
