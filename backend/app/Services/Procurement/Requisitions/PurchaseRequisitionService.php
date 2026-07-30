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
use Illuminate\Auth\Access\AuthorizationException;
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
            $projectId = isset($data['project_id']) ? (int) $data['project_id'] : null;

            if ($projectId && $this->isBomShortagePayload($data, $defaultTrigger)) {
                $existing = $this->findOpenBomShortageForProject($projectId, lock: true);
                if ($existing) {
                    throw ValidationException::withMessages([
                        'project_id' => ['An open BOM shortage requisition already exists for this project.'],
                    ]);
                }
            }

            $requisition = PurchaseRequisition::query()->create([
                'reference' => $this->refs->requisition(),
                'project_id' => $data['project_id'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'status' => RequisitionStatus::Draft,
                'notes' => $data['notes'] ?? null,
                'required_by' => $data['required_by'] ?? null,
                'requested_by' => $user->id,
            ]);

            $this->createLines($requisition, $data['lines'] ?? [], $defaultTrigger);

            $this->audit->log('requisition.created', $requisition);

            return $requisition->load([
                'lines.warehouseItem',
                'lines.preferredSupplier',
                'project',
                'supplier',
                'requester',
                'approver',
                'purchaseOrders.lines',
            ]);
        });
    }

    /**
     * Find an open (draft / pending / approved) BOM-shortage requisition for a project.
     */
    public function findOpenBomShortageForProject(int $projectId, bool $lock = false): ?PurchaseRequisition
    {
        $query = PurchaseRequisition::query()
            ->where('project_id', $projectId)
            ->whereIn('status', $this->openStatuses())
            ->whereHas('lines', fn ($q) => $q->where('trigger_type', RequisitionTrigger::BomShortage->value))
            ->latest('id');

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->first();
    }

    /**
     * Replace all lines on a draft requisition (used to refresh auto BOM-shortage drafts).
     *
     * @param  array{notes?: string|null, lines: list<array<string, mixed>>}  $data
     */
    public function replaceDraftLines(
        PurchaseRequisition $requisition,
        array $data,
        ?RequisitionTrigger $defaultTrigger = null,
    ): PurchaseRequisition {
        return DB::transaction(function () use ($requisition, $data, $defaultTrigger) {
            $locked = PurchaseRequisition::query()
                ->whereKey($requisition->id)
                ->lockForUpdate()
                ->firstOrFail();

            $status = $locked->status instanceof RequisitionStatus
                ? $locked->status
                : RequisitionStatus::tryFrom((string) $locked->status);

            if ($status !== RequisitionStatus::Draft) {
                throw ValidationException::withMessages([
                    'status' => ['Only draft requisitions can have their lines replaced.'],
                ]);
            }

            if (array_key_exists('notes', $data)) {
                $locked->update(['notes' => $data['notes']]);
            }

            $locked->lines()->delete();
            $this->createLines($locked, $data['lines'] ?? [], $defaultTrigger);

            $this->audit->log('requisition.lines_updated', $locked);

            return $locked->fresh(['lines.warehouseItem', 'lines.preferredSupplier', 'project', 'supplier', 'requester', 'approver', 'purchaseOrders.lines']);
        });
    }

    /**
     * Update an editable (draft) requisition header and/or lines.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateEditable(PurchaseRequisition $requisition, array $data): PurchaseRequisition
    {
        return DB::transaction(function () use ($requisition, $data) {
            $locked = PurchaseRequisition::query()
                ->whereKey($requisition->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $locked->isEditable()) {
                throw ValidationException::withMessages([
                    'status' => ['Only draft requisitions can be updated.'],
                ]);
            }

            $header = [];
            if (array_key_exists('notes', $data)) {
                $header['notes'] = $data['notes'];
            }
            if (array_key_exists('supplier_id', $data)) {
                $header['supplier_id'] = $data['supplier_id'];
            }
            if (array_key_exists('required_by', $data)) {
                $header['required_by'] = $data['required_by'];
            }
            if ($header !== []) {
                $locked->update($header);
            }

            if (isset($data['lines']) && is_array($data['lines'])) {
                $this->applyLineUpdates($locked, $data['lines']);
            }

            $this->audit->log('requisition.updated', $locked);

            return $locked->fresh([
                'lines.warehouseItem',
                'lines.preferredSupplier',
                'project',
                'supplier',
                'requester',
                'approver',
                'purchaseOrders.lines',
            ]);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     */
    protected function applyLineUpdates(PurchaseRequisition $requisition, array $lines): void
    {
        $hasIds = collect($lines)->contains(fn (array $line) => isset($line['id']));

        if (! $hasIds) {
            $requisition->lines()->delete();
            $this->createLines($requisition, $lines);

            return;
        }

        foreach ($lines as $lineData) {
            if (! isset($lineData['id'])) {
                throw ValidationException::withMessages([
                    'lines' => ['When updating existing lines, every line must include its id.'],
                ]);
            }

            $line = $requisition->lines()->whereKey((int) $lineData['id'])->first();
            if (! $line) {
                throw ValidationException::withMessages([
                    'lines' => ["Line {$lineData['id']} does not belong to this requisition."],
                ]);
            }

            $updates = [];
            if (array_key_exists('quantity', $lineData)) {
                $updates['quantity'] = $lineData['quantity'];
            }
            if (array_key_exists('required_quantity', $lineData)) {
                $updates['required_quantity'] = $lineData['required_quantity'];
            }
            if (array_key_exists('preferred_supplier_id', $lineData)) {
                $updates['preferred_supplier_id'] = $lineData['preferred_supplier_id'];
            }
            if (array_key_exists('description', $lineData)) {
                $updates['description'] = $lineData['description'];
            }
            if (array_key_exists('warehouse_item_id', $lineData)) {
                $updates['warehouse_item_id'] = $lineData['warehouse_item_id'];
            }
            if (array_key_exists('sku', $lineData)) {
                $updates['sku'] = $lineData['sku'];
            }
            if (array_key_exists('estimated_unit_price', $lineData)) {
                $updates['estimated_unit_price'] = $lineData['estimated_unit_price'];
            }
            if (array_key_exists('notes', $lineData)) {
                $updates['notes'] = $lineData['notes'];
            }

            if ($updates !== []) {
                $line->update($updates);
            }
        }
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     */
    protected function createLines(
        PurchaseRequisition $requisition,
        array $lines,
        ?RequisitionTrigger $defaultTrigger = null,
    ): void {
        foreach ($lines as $line) {
            PurchaseRequisitionLine::query()->create([
                'purchase_requisition_id' => $requisition->id,
                'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
                'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                'description' => $line['description'],
                'sku' => $line['sku'] ?? null,
                'quantity' => $line['quantity'],
                'required_quantity' => $line['required_quantity'] ?? $line['quantity'],
                'unit_of_measure' => $line['unit_of_measure'] ?? null,
                'trigger_type' => $line['trigger_type'] ?? ($defaultTrigger?->value ?? RequisitionTrigger::Manual->value),
                'estimated_unit_price' => $line['estimated_unit_price'] ?? null,
                'notes' => $line['notes'] ?? null,
                'preferred_supplier_id' => $line['preferred_supplier_id'] ?? null,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function isBomShortagePayload(array $data, ?RequisitionTrigger $defaultTrigger): bool
    {
        if ($defaultTrigger === RequisitionTrigger::BomShortage) {
            return true;
        }

        foreach ($data['lines'] ?? [] as $line) {
            $trigger = $line['trigger_type'] ?? null;
            if ($trigger === RequisitionTrigger::BomShortage || $trigger === RequisitionTrigger::BomShortage->value) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    public function openStatuses(): array
    {
        return ['draft', 'pending_approval', 'submitted', 'approved'];
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

        return $requisition->fresh(['lines.warehouseItem', 'project', 'supplier', 'requester', 'approver']);
    }

    public function approve(PurchaseRequisition $requisition, User $user): PurchaseRequisition
    {
        $requisition->loadMissing('lines');

        $status = $requisition->status instanceof RequisitionStatus
            ? $requisition->status
            : RequisitionStatus::tryFrom((string) $requisition->status);

        if ($status !== RequisitionStatus::PendingApproval) {
            throw ValidationException::withMessages(['status' => ['Requisition is not pending approval.']]);
        }

        if ($requisition->requiresAdminApproval() && ! $this->isAdminApprover($user)) {
            throw new AuthorizationException('Only system admins can approve requisitions from this source.');
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

        return $requisition->fresh(['lines.warehouseItem', 'project', 'supplier', 'requester', 'approver']);
    }

    public function reject(PurchaseRequisition $requisition, User $user, string $reason): PurchaseRequisition
    {
        $requisition->loadMissing('lines');

        if ($requisition->status !== RequisitionStatus::PendingApproval) {
            throw ValidationException::withMessages(['status' => ['Requisition is not pending approval.']]);
        }

        if ($requisition->requiresAdminApproval() && ! $this->isAdminApprover($user)) {
            throw new AuthorizationException('Only system admins can reject requisitions from this source.');
        }

        $requisition->update([
            'status' => RequisitionStatus::Rejected,
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => $reason,
        ]);

        $this->audit->log('requisition.rejected', $requisition);

        return $requisition->fresh(['lines.warehouseItem', 'project', 'supplier', 'requester', 'approver']);
    }

    protected function isAdminApprover(User $user): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $user->departmentRoles()
            ->whereHas('role', fn ($query) => $query->where('name', 'super_admin'))
            ->exists();
    }
}
