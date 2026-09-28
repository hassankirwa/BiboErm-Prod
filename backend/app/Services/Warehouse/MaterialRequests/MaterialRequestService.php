<?php

namespace App\Services\Warehouse\MaterialRequests;

use App\Enums\ProjectStage;
use App\Enums\Procurement\RequisitionTrigger;
use App\Enums\Warehouse\MaterialRequestSource;
use App\Enums\Warehouse\MaterialRequestStatus;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\MaterialRequest;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use App\Services\Warehouse\Movements\IssueStockService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MaterialRequestService
{
    public function __construct(
        protected IssueStockService $issueStock,
        protected PurchaseRequisitionService $requisitions,
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * @param  array<int, array{warehouse_item_id: int, quantity: string|float|int, notes?: string|null}>  $lines
     */
    public function create(
        User $user,
        int $projectId,
        array $lines,
        MaterialRequestSource $source,
        ?string $reason = null,
        ?string $notes = null,
    ): MaterialRequest {
        $project = Project::query()->findOrFail($projectId);
        $this->assertProjectIncomplete($project);

        if ($lines === []) {
            throw ValidationException::withMessages([
                'lines' => ['At least one material line is required.'],
            ]);
        }

        return DB::transaction(function () use ($user, $project, $lines, $source, $reason, $notes) {
            $request = MaterialRequest::query()->create([
                'project_id' => $project->id,
                'requested_by' => $user->id,
                'source' => $source,
                'status' => MaterialRequestStatus::Pending,
                'reason' => $reason,
                'notes' => $notes,
            ]);

            foreach ($lines as $line) {
                $request->lines()->create([
                    'warehouse_item_id' => (int) $line['warehouse_item_id'],
                    'quantity_requested' => bcadd((string) $line['quantity'], '0', 3),
                    'quantity_fulfilled' => '0.000',
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            $this->audit->materialRequestCreated($request->id, [
                'project_id' => $project->id,
                'source' => $source->value,
                'line_count' => count($lines),
            ]);

            return $request->fresh([
                'lines.item',
                'project',
                'requester',
            ]);
        });
    }

    /**
     * Issue available stock against a pending request. Optionally draft a PR for remaining shortage.
     *
     * @param  array<int, array{line_id: int, from_bin_id: int, quantity: string|float|int}>  $fulfillLines
     */
    public function fulfill(
        User $user,
        MaterialRequest $request,
        array $fulfillLines,
        bool $draftShortageRequisition = true,
        ?string $notes = null,
    ): MaterialRequest {
        if ($request->status !== MaterialRequestStatus::Pending && $request->status !== MaterialRequestStatus::Partial) {
            throw ValidationException::withMessages([
                'status' => ['Only pending or partial requests can be fulfilled.'],
            ]);
        }

        $this->assertProjectIncomplete($request->project ?? Project::query()->findOrFail($request->project_id));

        return DB::transaction(function () use ($user, $request, $fulfillLines, $draftShortageRequisition, $notes) {
            $request->loadMissing('lines');
            $issuePayload = [];
            $fulfilledByLine = [];

            foreach ($fulfillLines as $row) {
                $line = $request->lines->firstWhere('id', (int) $row['line_id']);
                if (! $line) {
                    throw ValidationException::withMessages([
                        'lines' => ['Invalid request line #'.((int) $row['line_id']).'.'],
                    ]);
                }

                $qty = bcadd((string) $row['quantity'], '0', 3);
                if (bccomp($qty, '0', 3) <= 0) {
                    continue;
                }

                $remaining = bcsub((string) $line->quantity_requested, (string) $line->quantity_fulfilled, 3);
                if (bccomp($qty, $remaining, 3) === 1) {
                    throw ValidationException::withMessages([
                        'lines' => ["Quantity for {$line->item?->sku} exceeds remaining requested ({$remaining})."],
                    ]);
                }

                $issuePayload[] = [
                    'item_id' => $line->warehouse_item_id,
                    'from_bin_id' => (int) $row['from_bin_id'],
                    'quantity' => $qty,
                ];
                $fulfilledByLine[$line->id] = bcadd($fulfilledByLine[$line->id] ?? '0', $qty, 3);
            }

            $movement = null;
            if ($issuePayload !== []) {
                $movement = $this->issueStock->issueToProject(
                    performer: $user,
                    projectId: $request->project_id,
                    lines: $issuePayload,
                    notes: trim(($notes ?? '').' Additional materials request #'.$request->id) ?: null,
                );

                foreach ($fulfilledByLine as $lineId => $qty) {
                    $line = $request->lines->firstWhere('id', $lineId);
                    $line->quantity_fulfilled = bcadd((string) $line->quantity_fulfilled, $qty, 3);
                    $line->save();
                }
            }

            $request->refresh()->load('lines.item');
            $allDone = $request->lines->every(
                fn ($line) => bccomp((string) $line->quantity_fulfilled, (string) $line->quantity_requested, 3) >= 0
            );
            $anyDone = $request->lines->contains(
                fn ($line) => bccomp((string) $line->quantity_fulfilled, '0', 3) === 1
            );

            $requisition = null;
            if ($draftShortageRequisition && ! $allDone) {
                $shortageLines = [];
                foreach ($request->lines as $line) {
                    $remaining = bcsub((string) $line->quantity_requested, (string) $line->quantity_fulfilled, 3);
                    if (bccomp($remaining, '0', 3) !== 1) {
                        continue;
                    }
                    $shortageLines[] = [
                        'warehouse_item_id' => $line->warehouse_item_id,
                        'description' => $line->item?->name ?? ('Item #'.$line->warehouse_item_id),
                        'quantity' => $remaining,
                        'unit_of_measure' => $line->item?->unit_of_measure,
                        'trigger_type' => RequisitionTrigger::AdditionalMaterial->value,
                    ];
                }

                if ($shortageLines !== []) {
                    $requisition = $this->requisitions->createDraft($user, [
                        'project_id' => $request->project_id,
                        'notes' => 'Additional materials shortage for request #'.$request->id
                            .($request->reason ? ' — '.$request->reason : ''),
                        'lines' => $shortageLines,
                    ], RequisitionTrigger::AdditionalMaterial);
                }
            }

            $status = $allDone
                ? MaterialRequestStatus::Fulfilled
                : ($anyDone || $requisition ? MaterialRequestStatus::Partial : MaterialRequestStatus::Pending);

            $request->update([
                'status' => $status,
                'fulfilled_by' => $user->id,
                'fulfilled_at' => now(),
                'stock_movement_id' => $movement?->id ?? $request->stock_movement_id,
                'purchase_requisition_id' => $requisition?->id ?? $request->purchase_requisition_id,
                'notes' => $notes ? trim(($request->notes ? $request->notes."\n" : '').$notes) : $request->notes,
            ]);

            $this->audit->materialRequestFulfilled($request->id, [
                'status' => $status->value,
                'movement_id' => $movement?->id,
                'requisition_id' => $requisition?->id,
            ]);

            return $request->fresh([
                'lines.item',
                'project',
                'requester',
                'fulfiller',
                'stockMovement',
                'purchaseRequisition',
            ]);
        });
    }

    public function reject(User $user, MaterialRequest $request, ?string $notes = null): MaterialRequest
    {
        if ($request->status !== MaterialRequestStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending requests can be rejected.'],
            ]);
        }

        $request->update([
            'status' => MaterialRequestStatus::Rejected,
            'fulfilled_by' => $user->id,
            'fulfilled_at' => now(),
            'notes' => $notes ? trim(($request->notes ? $request->notes."\n" : '').'Rejected: '.$notes) : $request->notes,
        ]);

        $this->audit->materialRequestRejected($request->id, [
            'notes' => $notes,
        ]);

        return $request->fresh([
            'lines.item',
            'project',
            'requester',
            'fulfiller',
        ]);
    }

    protected function assertProjectIncomplete(Project $project): void
    {
        $stage = $project->stage instanceof ProjectStage
            ? $project->stage
            : ProjectStage::tryFrom((string) $project->stage);

        if ($stage === ProjectStage::ProjectComplete) {
            throw ValidationException::withMessages([
                'project_id' => ['Cannot request additional materials for a completed project.'],
            ]);
        }
    }
}
