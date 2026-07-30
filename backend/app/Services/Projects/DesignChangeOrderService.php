<?php

namespace App\Services\Projects;

use App\Enums\FieldInstallation\NonConformityType;
use App\Enums\Production\ProductionOrderStatus;
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

    public function createRemake(DesignChangeOrder $dco, User $actor): DesignChangeOrder
    {
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

        return DB::transaction(function () use ($dco, $actor) {
            $order = $this->productionOrders->createRemakeFromDesignChange($dco, $actor);

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
