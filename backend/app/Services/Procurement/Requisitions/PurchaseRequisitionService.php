<?php

namespace App\Services\Procurement\Requisitions;

use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Procurement\RequisitionTrigger;
use App\Events\Procurement\PurchaseRequisitionApproved;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\User;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseRequisitionService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
    ) {}

    public function createDraft(User $user, array $data, ?RequisitionTrigger $defaultTrigger = null): PurchaseRequisition
    {
        return DB::transaction(function () use ($user, $data, $defaultTrigger) {
            $requisition = PurchaseRequisition::query()->create([
                'reference' => $this->refs->requisition(),
                'project_id' => $data['project_id'] ?? null,
                'status' => RequisitionStatus::Draft,
                'notes' => $data['notes'] ?? null,
                'requested_by' => $user->id,
            ]);

            foreach ($data['lines'] ?? [] as $line) {
                PurchaseRequisitionLine::query()->create([
                    'purchase_requisition_id' => $requisition->id,
                    'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
                    'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                    'description' => $line['description'],
                    'sku' => $line['sku'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_of_measure' => $line['unit_of_measure'] ?? null,
                    'trigger_type' => $line['trigger_type'] ?? ($defaultTrigger?->value ?? RequisitionTrigger::Manual->value),
                    'estimated_unit_price' => $line['estimated_unit_price'] ?? null,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            $this->audit->log('requisition.created', $requisition);

            return $requisition->load('lines');
        });
    }

    public function submit(PurchaseRequisition $requisition): PurchaseRequisition
    {
        $status = $requisition->status instanceof RequisitionStatus
            ? $requisition->status
            : RequisitionStatus::tryFrom((string) $requisition->status);

        if ($status !== RequisitionStatus::Draft) {
            throw ValidationException::withMessages(['status' => ['Only draft requisitions can be submitted.']]);
        }

        $requisition->update([
            'status' => RequisitionStatus::PendingApproval,
            'submitted_at' => now(),
        ]);

        return $requisition->fresh('lines');
    }

    public function approve(PurchaseRequisition $requisition, User $user): PurchaseRequisition
    {
        $status = $requisition->status instanceof RequisitionStatus
            ? $requisition->status
            : RequisitionStatus::tryFrom((string) $requisition->status);

        if ($status !== RequisitionStatus::PendingApproval) {
            throw ValidationException::withMessages(['status' => ['Requisition is not pending approval.']]);
        }

        $requisition->update([
            'status' => RequisitionStatus::Approved,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $trigger = $requisition->lines->first()?->trigger_type ?? RequisitionTrigger::Manual;

        PurchaseRequisitionApproved::dispatch(
            $requisition->id,
            $requisition->project_id,
            $user->id,
            $trigger instanceof RequisitionTrigger ? $trigger : RequisitionTrigger::from((string) $trigger),
        );

        $this->audit->log('requisition.approved', $requisition);

        return $requisition->fresh('lines');
    }

    public function reject(PurchaseRequisition $requisition, User $user, string $reason): PurchaseRequisition
    {
        if ($requisition->status !== RequisitionStatus::PendingApproval) {
            throw ValidationException::withMessages(['status' => ['Requisition is not pending approval.']]);
        }

        $requisition->update([
            'status' => RequisitionStatus::Rejected,
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => $reason,
        ]);

        $this->audit->log('requisition.rejected', $requisition);

        return $requisition->fresh('lines');
    }
}
