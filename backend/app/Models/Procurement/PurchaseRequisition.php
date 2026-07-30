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
        'required_by',
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
            'required_by' => 'date',
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

    public function isEditable(): bool
    {
        $status = $this->status instanceof RequisitionStatus
            ? $this->status
            : RequisitionStatus::tryFrom((string) $this->status);

        return $status === RequisitionStatus::Draft;
    }

    /**
     * @return list<int>
     */
    public function orderedRequisitionLineIds(): array
    {
        if ($this->relationLoaded('purchaseOrders')) {
            return $this->purchaseOrders
                ->flatMap(function (PurchaseOrder $order) {
                    return $order->relationLoaded('lines')
                        ? $order->lines->pluck('requisition_line_id')
                        : $order->lines()->pluck('requisition_line_id');
                })
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
        }

        return PurchaseOrderLine::query()
            ->whereHas('purchaseOrder', fn ($q) => $q->where('requisition_id', $this->id))
            ->whereNotNull('requisition_line_id')
            ->pluck('requisition_line_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Lines not yet covered by a purchase order.
     *
     * @return \Illuminate\Support\Collection<int, PurchaseRequisitionLine>
     */
    public function uncoveredLines()
    {
        $this->loadMissing(['lines', 'purchaseOrders.lines']);
        $ordered = $this->orderedRequisitionLineIds();

        // Legacy single-PO path: older POs may lack requisition_line_id links.
        if ($ordered === [] && $this->purchaseOrders->isNotEmpty()) {
            $hasLinkedLines = $this->purchaseOrders
                ->flatMap(fn (PurchaseOrder $order) => $order->lines)
                ->contains(fn ($line) => $line->requisition_line_id);

            if (! $hasLinkedLines) {
                return collect();
            }
        }

        $orderedLookup = array_flip($ordered);

        return $this->lines
            ->reject(fn (PurchaseRequisitionLine $line) => isset($orderedLookup[$line->id]))
            ->values();
    }

    public function canCreatePurchaseOrder(): bool
    {
        $status = $this->status instanceof RequisitionStatus
            ? $this->status
            : RequisitionStatus::tryFrom((string) $this->status);

        if ($status !== RequisitionStatus::Approved) {
            return false;
        }

        return $this->uncoveredLines()->isNotEmpty();
    }
}
