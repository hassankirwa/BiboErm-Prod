<?php

namespace App\Services\Projects;

use App\Enums\FieldInstallation\NonConformityType;
use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Enums\Projects\DesignChangeOrderStatus;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\Projects\DesignChangeOrder;
use App\Models\User;
use App\Services\Production\ProductionOrderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DesignChangeOrderService
{
    /**
     * @var list<NonConformityType>
     */
    private const REMEASURE_TYPES = [
        NonConformityType::WrongMeasurement,
        NonConformityType::DimensionMismatch,
    ];

    public function __construct(
        protected ProjectStageService $stages,
        protected ProductionOrderService $productionOrders,
    ) {}

    /**
     * @param  array{
     *     reason?: string|null,
     *     measurement_notes?: array|string|null,
     *     scope_bom_line_ids?: list<int>|null,
     *     parent_production_order_id?: int|null,
     * }  $data
     */
    public function createFromNonConformity(
        FieldNonConformity $nc,
        User $actor,
        array $data = [],
    ): DesignChangeOrder {
        $ncType = $nc->nc_type instanceof NonConformityType
            ? $nc->nc_type
            : NonConformityType::tryFrom((string) $nc->nc_type);

        if (! $ncType || ! in_array($ncType, self::REMEASURE_TYPES, true)) {
            throw ValidationException::withMessages([
                'nc_type' => ['Design change orders require wrong_measurement or dimension_mismatch.'],
            ]);
        }

        $existing = DesignChangeOrder::query()
            ->where('field_non_conformity_id', $nc->id)
            ->whereNotIn('status', [
                DesignChangeOrderStatus::Cancelled->value,
            ])
            ->first();

        if ($existing) {
            return $existing->loadMissing(['project', 'nonConformity', 'parentProductionOrder']);
        }

        return DB::transaction(function () use ($nc, $actor, $data) {
            $parentOrderId = $data['parent_production_order_id']
                ?? $this->resolveParentProductionOrderId((int) $nc->project_id);

            $measurementNotes = $data['measurement_notes'] ?? null;
            if (is_string($measurementNotes)) {
                $measurementNotes = ['notes' => $measurementNotes];
            }

            $scope = $data['scope_bom_line_ids'] ?? null;
            if ($scope === null && $nc->project_bom_line_id) {
                $scope = [(int) $nc->project_bom_line_id];
            }

            $dco = DesignChangeOrder::query()->create([
                'project_id' => $nc->project_id,
                'field_non_conformity_id' => $nc->id,
                'status' => DesignChangeOrderStatus::Drafted,
                'reason' => $data['reason'] ?? $nc->description ?? $nc->title,
                'measurement_notes' => $measurementNotes,
                'scope_bom_line_ids' => $scope,
                'parent_production_order_id' => $parentOrderId,
                'requested_by' => $actor->id,
            ]);

            return $dco->fresh(['project', 'nonConformity', 'parentProductionOrder', 'requester']);
        });
    }

    /**
     * @param  array{
     *     reason?: string|null,
     *     measurement_notes?: array|string|null,
     *     scope_bom_line_ids?: list<int>|null,
     *     field_non_conformity_id?: int|null,
     *     parent_production_order_id?: int|null,
     * }  $data
     */
    public function createForProject(Project $project, User $actor, array $data): DesignChangeOrder
    {
        if (! empty($data['field_non_conformity_id'])) {
            $nc = FieldNonConformity::query()->findOrFail((int) $data['field_non_conformity_id']);

            if ((int) $nc->project_id !== (int) $project->id) {
                throw ValidationException::withMessages([
                    'field_non_conformity_id' => ['Non-conformity does not belong to this project.'],
                ]);
            }

            return $this->createFromNonConformity($nc, $actor, $data);
        }

        return DB::transaction(function () use ($project, $actor, $data) {
            $measurementNotes = $data['measurement_notes'] ?? null;
            if (is_string($measurementNotes)) {
                $measurementNotes = ['notes' => $measurementNotes];
            }

            $dco = DesignChangeOrder::query()->create([
                'project_id' => $project->id,
                'field_non_conformity_id' => null,
                'status' => DesignChangeOrderStatus::Drafted,
                'reason' => $data['reason'] ?? null,
                'measurement_notes' => $measurementNotes,
                'scope_bom_line_ids' => $data['scope_bom_line_ids'] ?? null,
                'parent_production_order_id' => $data['parent_production_order_id']
                    ?? $this->resolveParentProductionOrderId((int) $project->id),
                'requested_by' => $actor->id,
            ]);

            return $dco->fresh(['project', 'requester', 'parentProductionOrder']);
        });
    }

    public function approveAndRewind(
        DesignChangeOrder $dco,
        User $actor,
        ProjectStage $targetStage,
    ): DesignChangeOrder {
        if ($dco->status->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['Closed or cancelled design change orders cannot be approved.'],
            ]);
        }

        if (! in_array($dco->status, [
            DesignChangeOrderStatus::Drafted,
            DesignChangeOrderStatus::AwaitingRemeasure,
            DesignChangeOrderStatus::DesignInProgress,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot approve design change order in status {$dco->status->value}."],
            ]);
        }

        return DB::transaction(function () use ($dco, $actor, $targetStage) {
            $active = $this->productionOrders->findActiveForProject((int) $dco->project_id);
            if ($active) {
                $this->productionOrders->updateStatus($active, ProductionOrderStatus::OnHold);
                if (! $dco->parent_production_order_id) {
                    $dco->parent_production_order_id = $active->id;
                }
            }

            $nextStatus = match ($targetStage) {
                ProjectStage::SiteAssessment => DesignChangeOrderStatus::AwaitingRemeasure,
                ProjectStage::FinalDesignApproval => DesignChangeOrderStatus::DesignInProgress,
                ProjectStage::BomFinalized,
                ProjectStage::MaterialCheck => DesignChangeOrderStatus::BomRevised,
                ProjectStage::MaterialsReady,
                ProjectStage::MaterialsReleased => DesignChangeOrderStatus::MaterialsReady,
                default => DesignChangeOrderStatus::AwaitingRemeasure,
            };

            $project = Project::query()->findOrFail($dco->project_id);
            $this->stages->transition($project, $targetStage, $actor, [
                'force' => true,
                'reason' => sprintf(
                    'Design change order #%d approved: %s',
                    $dco->id,
                    $dco->reason ?? 'remeasure / redesign',
                ),
            ]);

            $dco->forceFill([
                'status' => $nextStatus,
                'approved_by' => $actor->id,
                'parent_production_order_id' => $dco->parent_production_order_id,
            ])->save();

            return $dco->fresh([
                'project',
                'nonConformity',
                'parentProductionOrder',
                'approver',
                'requester',
            ]);
        });
    }

    public function createRemake(
        DesignChangeOrder $dco,
        User $actor,
        ?ProductionStage $startStage = null,
    ): DesignChangeOrder {
        if ($dco->status->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['Closed or cancelled design change orders cannot create a remake.'],
            ]);
        }

        if ($dco->remake_production_order_id) {
            return $dco->fresh([
                'project',
                'remakeProductionOrder',
                'parentProductionOrder',
            ]);
        }

        if (! in_array($dco->status, [
            DesignChangeOrderStatus::BomRevised,
            DesignChangeOrderStatus::MaterialsReady,
            DesignChangeOrderStatus::DesignInProgress,
            DesignChangeOrderStatus::AwaitingRemeasure,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot create remake from status {$dco->status->value}."],
            ]);
        }

        $path = $this->changePath($dco);
        if ($path === 'minor_material') {
            throw ValidationException::withMessages([
                'change_path' => ['Minor material changes do not create a remake PO. Use complete minor instead.'],
            ]);
        }

        return DB::transaction(function () use ($dco, $actor, $startStage) {
            $order = $this->productionOrders->createRemakeFromDesignChange($dco, $actor, $startStage);

            $dco->forceFill([
                'remake_production_order_id' => $order->id,
                'status' => DesignChangeOrderStatus::RemakeInProduction,
                'parent_production_order_id' => $dco->parent_production_order_id ?? $order->parent_production_order_id,
            ])->save();

            return $dco->fresh([
                'project',
                'remakeProductionOrder',
                'parentProductionOrder',
                'approver',
                'requester',
            ]);
        });
    }

    /**
     * @param  array{
     *     reason?: string|null,
     *     change_path?: 'full_remake'|'minor_material'|null,
     *     items?: list<array{id?: string, description: string, qty?: numeric, unit?: string, change_type?: string, done?: bool}>,
     *     notes?: string|null,
     * }  $data
     */
    public function updateDetails(DesignChangeOrder $dco, array $data): DesignChangeOrder
    {
        if ($dco->status->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['Closed or cancelled design change orders cannot be edited.'],
            ]);
        }

        $notes = is_array($dco->measurement_notes) ? $dco->measurement_notes : [];

        if (array_key_exists('notes', $data)) {
            $notes['notes'] = $data['notes'];
        }

        if (array_key_exists('change_path', $data) && $data['change_path'] !== null) {
            if (! in_array($data['change_path'], ['full_remake', 'minor_material'], true)) {
                throw ValidationException::withMessages([
                    'change_path' => ['Change path must be full_remake or minor_material.'],
                ]);
            }
            $notes['change_path'] = $data['change_path'];
        }

        if (array_key_exists('items', $data)) {
            $notes['items'] = $this->normalizeItems($data['items'] ?? []);
        }

        $updates = ['measurement_notes' => $notes];
        if (array_key_exists('reason', $data) && $data['reason'] !== null) {
            $updates['reason'] = $data['reason'];
        }

        $dco->forceFill($updates)->save();

        return $dco->fresh([
            'project',
            'nonConformity',
            'parentProductionOrder',
            'remakeProductionOrder',
            'requester',
            'approver',
        ]);
    }

    /**
     * Finished listing required changes — ready for production decision.
     */
    public function releaseToProduction(DesignChangeOrder $dco, User $actor): DesignChangeOrder
    {
        if ($dco->status->isTerminal()) {
            throw ValidationException::withMessages([
                'status' => ['Closed or cancelled design change orders cannot be released.'],
            ]);
        }

        $notes = is_array($dco->measurement_notes) ? $dco->measurement_notes : [];
        $items = $notes['items'] ?? [];
        $path = $notes['change_path'] ?? null;

        if (! is_array($items) || count($items) === 0) {
            throw ValidationException::withMessages([
                'items' => ['Add at least one required change item before releasing to production.'],
            ]);
        }

        if (! in_array($path, ['full_remake', 'minor_material'], true)) {
            throw ValidationException::withMessages([
                'change_path' => ['Choose full remake or minor material change before releasing.'],
            ]);
        }

        $dco->forceFill([
            'status' => DesignChangeOrderStatus::MaterialsReady,
            'approved_by' => $dco->approved_by ?? $actor->id,
        ])->save();

        return $dco->fresh([
            'project',
            'nonConformity',
            'parentProductionOrder',
            'remakeProductionOrder',
            'requester',
            'approver',
        ]);
    }

    /**
     * Minor material-only path: mark done and optionally advance toward transit/site.
     *
     * @param  array{advance_to_stage?: string|null}  $data
     */
    public function completeMinor(DesignChangeOrder $dco, User $actor, array $data = []): DesignChangeOrder
    {
        if ($this->changePath($dco) !== 'minor_material') {
            throw ValidationException::withMessages([
                'change_path' => ['Only minor material changes can be completed without a remake PO.'],
            ]);
        }

        if ($dco->status->isTerminal()) {
            return $dco->fresh([
                'project',
                'remakeProductionOrder',
                'parentProductionOrder',
            ]);
        }

        if (! in_array($dco->status, [
            DesignChangeOrderStatus::MaterialsReady,
            DesignChangeOrderStatus::BomRevised,
            DesignChangeOrderStatus::DesignInProgress,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Release the change to production first, then mark the minor material change done.'],
            ]);
        }

        return DB::transaction(function () use ($dco, $actor, $data) {
            $notes = is_array($dco->measurement_notes) ? $dco->measurement_notes : [];
            $items = $notes['items'] ?? [];
            if (is_array($items)) {
                $notes['items'] = array_map(static function ($item) {
                    if (! is_array($item)) {
                        return $item;
                    }
                    $item['done'] = true;

                    return $item;
                }, $items);
            }
            $notes['completed_at'] = now()->toIso8601String();
            $notes['completed_by'] = $actor->id;

            $dco->forceFill([
                'measurement_notes' => $notes,
                'status' => DesignChangeOrderStatus::Closed,
            ])->save();

            $target = $data['advance_to_stage'] ?? null;
            if (is_string($target) && $target !== '') {
                $project = $dco->project ?? Project::query()->findOrFail($dco->project_id);
                $this->stages->transition($project, ProjectStage::from($target), $actor, [
                    'reason' => 'Minor design change completed — ready for transit/site',
                    'force' => true,
                ]);
            }

            return $dco->fresh([
                'project',
                'remakeProductionOrder',
                'parentProductionOrder',
                'approver',
                'requester',
                'nonConformity',
            ]);
        });
    }

    public function close(DesignChangeOrder $dco, User $actor): DesignChangeOrder
    {
        if ($dco->status === DesignChangeOrderStatus::Closed) {
            return $dco->fresh([
                'project',
                'remakeProductionOrder',
                'parentProductionOrder',
            ]);
        }

        if ($dco->status === DesignChangeOrderStatus::Cancelled) {
            throw ValidationException::withMessages([
                'status' => ['Cancelled design change orders cannot be closed.'],
            ]);
        }

        if ($this->changePath($dco) === 'minor_material' && $dco->status === DesignChangeOrderStatus::MaterialsReady) {
            return $this->completeMinor($dco, $actor);
        }

        if ($dco->status !== DesignChangeOrderStatus::RemakeInProduction) {
            throw ValidationException::withMessages([
                'status' => ['Design change order can only be closed after remake production starts.'],
            ]);
        }

        $remake = $dco->remakeProductionOrder
            ?? ($dco->remake_production_order_id
                ? ProductionOrder::query()->find($dco->remake_production_order_id)
                : null);

        if ($remake && $remake->status !== ProductionOrderStatus::Completed) {
            throw ValidationException::withMessages([
                'status' => ['Remake production order must be completed before closing the design change order.'],
            ]);
        }

        $dco->forceFill([
            'status' => DesignChangeOrderStatus::Closed,
        ])->save();

        return $dco->fresh([
            'project',
            'remakeProductionOrder',
            'parentProductionOrder',
            'approver',
            'requester',
            'nonConformity',
        ]);
    }

    public function markMaterialsReady(DesignChangeOrder $dco): DesignChangeOrder
    {
        if (in_array($dco->status, [
            DesignChangeOrderStatus::BomRevised,
            DesignChangeOrderStatus::DesignInProgress,
            DesignChangeOrderStatus::AwaitingRemeasure,
        ], true)) {
            $dco->forceFill([
                'status' => DesignChangeOrderStatus::MaterialsReady,
            ])->save();
        }

        return $dco->fresh();
    }

    /**
     * @param  list<mixed>  $items
     * @return list<array{id: string, description: string, qty: float|int, unit: string, change_type: string, done: bool}>
     */
    protected function normalizeItems(array $items): array
    {
        $normalized = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $description = trim((string) ($item['description'] ?? ''));
            if ($description === '') {
                continue;
            }
            $normalized[] = [
                'id' => (string) ($item['id'] ?? uniqid('dci_', true)),
                'description' => $description,
                'qty' => is_numeric($item['qty'] ?? null) ? $item['qty'] + 0 : 1,
                'unit' => (string) ($item['unit'] ?? 'each'),
                'change_type' => in_array(($item['change_type'] ?? ''), ['remake', 'material'], true)
                    ? $item['change_type']
                    : 'remake',
                'done' => (bool) ($item['done'] ?? false),
            ];
        }

        return $normalized;
    }

    protected function changePath(DesignChangeOrder $dco): ?string
    {
        $notes = is_array($dco->measurement_notes) ? $dco->measurement_notes : [];
        $path = $notes['change_path'] ?? null;

        return is_string($path) ? $path : null;
    }

    protected function resolveParentProductionOrderId(int $projectId): ?int
    {
        $active = $this->productionOrders->findActiveForProject($projectId);
        if ($active) {
            return $active->id;
        }

        $latest = ProductionOrder::query()
            ->where('project_id', $projectId)
            ->orderByDesc('id')
            ->first();

        return $latest?->id;
    }
}
