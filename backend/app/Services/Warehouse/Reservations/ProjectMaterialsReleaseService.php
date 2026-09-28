<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\ProjectStage;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\MaterialReleaseBatch;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Production\ProductionOrderService;
use App\Services\Projects\ProjectMaterialStatusService;
use App\Services\Projects\ProjectStageService;
use App\Services\Warehouse\Movements\StockMovementService;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ProjectMaterialsReleaseService
{
    public function __construct(
        protected OffcutAllocationService $offcuts,
        protected ProjectStageService $stages,
        protected WarehouseAuditLogger $audit,
        protected FifoReservationService $fifoReservation,
        protected StockMovementService $movements,
        protected ProjectMaterialStatusService $materialStatus,
        protected ProductionOrderService $productionOrders,
    ) {}

    /**
     * Hand reserved materials to production: subtract stock, record receiver, advance stage.
     *
     * @param  list<array{item_id: int, quantity?: string|float|int|null}>|null  $lines
     *         When null/empty → release all remaining (compat). When set → checklist partial release.
     * @return array{
     *     reservation: StockReservation,
     *     movement_id: int|null,
     *     batch_id: int|null,
     *     offcut_lines: list<array<string, mixed>>,
     *     project_stage: string,
     *     is_partial: bool
     * }
     */
    public function releaseForProduction(
        Project $project,
        User $performer,
        int $receivedByUserId,
        ?string $notes = null,
        ?array $lines = null,
    ): array {
        $receiver = User::query()->find($receivedByUserId);
        if (! $receiver) {
            throw ValidationException::withMessages([
                'received_by' => ['Select who received the materials.'],
            ]);
        }

        $reservation = StockReservation::query()
            ->where('project_id', $project->id)
            ->whereIn('status', [
                ReservationStatus::Pending,
                ReservationStatus::Partial,
            ])
            ->latest('id')
            ->first();

        if (! $reservation) {
            throw ValidationException::withMessages([
                'reservation' => ['No active reservation found for this project. Reserve materials first.'],
            ]);
        }

        $currentStage = $this->stages->currentStage($project);

        if (! in_array($currentStage, [
            ProjectStage::MaterialsReady,
            ProjectStage::MaterialsReserved,
            ProjectStage::AwaitingProcurement,
            ProjectStage::MaterialsReleased,
        ], true)) {
            throw ValidationException::withMessages([
                'stage' => ['Materials can only be released when the project has reserved materials ready for handover.'],
            ]);
        }

        $reservation->load(['lines.item', 'lines.bin']);

        $hasRemaining = $reservation->lines->contains(
            fn (StockReservationLine $line) => bccomp($line->remainingQuantity(), '0', 3) === 1
        );

        if (! $hasRemaining) {
            throw ValidationException::withMessages([
                'reservation' => ['Reservation has no remaining quantity to issue to production.'],
            ]);
        }

        $quantitiesByItemId = $this->normalizeChecklistLines($lines, $reservation);
        $isPartialChecklist = $quantitiesByItemId !== null;

        $offcutLines = $this->buildOffcutSummary($project->id, $reservation, $quantitiesByItemId);

        return DB::transaction(function () use (
            $project,
            $performer,
            $receiver,
            $notes,
            $reservation,
            $offcutLines,
            $quantitiesByItemId,
            $isPartialChecklist,
        ) {
            $this->prepareProductionHandover(
                project: $project->fresh(),
                performer: $performer,
                reservation: $reservation,
                notes: $notes,
            );

            $beforeReleased = $reservation->lines
                ->mapWithKeys(fn (StockReservationLine $line) => [$line->id => (string) $line->quantity_released])
                ->all();

            try {
                $updated = $quantitiesByItemId !== null
                    ? $this->fifoReservation->release(
                        reservation: $reservation,
                        quantitiesByItemId: $quantitiesByItemId,
                    )
                    : $this->fifoReservation->release($reservation);
            } catch (InvalidArgumentException $exception) {
                throw ValidationException::withMessages([
                    'lines' => [$exception->getMessage()],
                ]);
            }

            $movementLines = [];
            $batchLineRows = [];
            foreach ($updated->lines as $line) {
                $previous = $beforeReleased[$line->id] ?? '0';
                $delta = bcsub((string) $line->quantity_released, $previous, 3);
                if (bccomp($delta, '0', 3) !== 1) {
                    continue;
                }
                $movementLines[] = [
                    'item_id' => $line->item_id,
                    'from_bin_id' => $line->bin_id,
                    'quantity' => $delta,
                ];
                $batchLineRows[] = [
                    'stock_reservation_line_id' => $line->id,
                    'item_id' => $line->item_id,
                    'bin_id' => $line->bin_id,
                    'quantity' => $delta,
                ];
            }

            if ($movementLines === []) {
                throw ValidationException::withMessages([
                    'lines' => ['No quantity was released. Select items with remaining reserved stock.'],
                ]);
            }

            $movement = $this->movements->recordOutboundDocument(
                performer: $performer,
                lines: $movementLines,
                referenceType: 'project',
                referenceId: $project->id,
                notes: $notes ?? ($isPartialChecklist
                    ? 'Warehouse checklist materials released to production'
                    : 'Warehouse materials released to production'),
            );

            $isPartial = $updated->status === ReservationStatus::Partial;

            $batch = MaterialReleaseBatch::query()->create([
                'project_id' => $project->id,
                'stock_reservation_id' => $updated->id,
                'stock_movement_id' => $movement->id,
                'released_by' => $performer->id,
                'received_by' => $receiver->id,
                'notes' => $notes,
                'is_partial' => $isPartial,
                'released_at' => now(),
            ]);

            foreach ($batchLineRows as $row) {
                $batch->lines()->create($row);
            }

            $updated->received_by = $receiver->id;
            $updated->released_at = now();
            $updated->release_notes = $notes;
            $updated->save();

            // Advance once any materials handed over (partial OK — production may commence).
            $this->transitionToMaterialsReleased(
                project: $project->fresh(),
                performer: $performer,
                notes: $notes,
            );

            $this->audit->materialsStagedForProduction($project->id, [
                'reservation_id' => $updated->id,
                'received_by' => $receiver->id,
                'movement_id' => $movement->id,
                'batch_id' => $batch->id,
                'is_partial' => $isPartial,
                'notes' => $notes,
            ]);

            return [
                'reservation' => $updated->fresh([
                    'lines.item',
                    'lines.bin',
                    'project',
                    'receivedByUser',
                    'reservedByUser',
                ]),
                'movement_id' => $movement->id,
                'batch_id' => $batch->id,
                'offcut_lines' => $offcutLines,
                'project_stage' => ProjectStage::MaterialsReleased->value,
                'is_partial' => $isPartial,
            ];
        });
    }

    /**
     * @param  list<array{item_id: int, quantity?: string|float|int|null}>|null  $lines
     * @return array<int, string>|null
     */
    protected function normalizeChecklistLines(?array $lines, StockReservation $reservation): ?array
    {
        if ($lines === null || $lines === []) {
            return null;
        }

        $remainingByItem = [];
        foreach ($reservation->lines as $line) {
            $itemId = (int) $line->item_id;
            $remainingByItem[$itemId] = bcadd(
                $remainingByItem[$itemId] ?? '0',
                $line->remainingQuantity(),
                3
            );
        }

        $quantities = [];
        foreach ($lines as $row) {
            $itemId = (int) $row['item_id'];
            if (! array_key_exists($itemId, $remainingByItem)) {
                throw ValidationException::withMessages([
                    'lines' => ["Item #{$itemId} is not on this project's reservation."],
                ]);
            }

            $requested = array_key_exists('quantity', $row) && $row['quantity'] !== null && $row['quantity'] !== ''
                ? bcadd((string) $row['quantity'], '0', 3)
                : $remainingByItem[$itemId];

            if (bccomp($requested, '0', 3) !== 1) {
                continue;
            }

            if (bccomp($requested, $remainingByItem[$itemId], 3) === 1) {
                throw ValidationException::withMessages([
                    'lines' => ["Release quantity for item #{$itemId} exceeds remaining reserved ({$remainingByItem[$itemId]})."],
                ]);
            }

            $quantities[$itemId] = bcadd($quantities[$itemId] ?? '0', $requested, 3);
        }

        if ($quantities === []) {
            throw ValidationException::withMessages([
                'lines' => ['Select at least one line with a positive quantity to release.'],
            ]);
        }

        return $quantities;
    }

    protected function prepareProductionHandover(
        Project $project,
        User $performer,
        StockReservation $reservation,
        ?string $notes,
    ): void {
        $current = $this->stages->currentStage($project);

        if (in_array($current, [ProjectStage::AwaitingProcurement, ProjectStage::MaterialsReserved], true)) {
            $this->materialStatus->assertCanAdvanceToMaterialsReady($project);

            if ($this->stages->canTransition($project, ProjectStage::MaterialsReady)) {
                $this->stages->transition($project, ProjectStage::MaterialsReady, $performer, [
                    'reason' => 'warehouse_materials_ready_for_release',
                    'delay_reason' => $notes,
                ]);
            }

            $project = $project->fresh();
            $current = $this->stages->currentStage($project);
        }

        if ($current === ProjectStage::MaterialsReady) {
            $this->productionOrders->ensureActiveOrder(
                projectId: $project->id,
                fifoSequence: (int) ($reservation->fifo_sequence ?? 1),
            );
        }
    }

    protected function transitionToMaterialsReleased(
        Project $project,
        User $performer,
        ?string $notes,
    ): void {
        if ($this->stages->currentStage($project) === ProjectStage::MaterialsReleased) {
            return;
        }

        if ($this->stages->canTransition($project, ProjectStage::MaterialsReleased)) {
            $this->stages->transition($project, ProjectStage::MaterialsReleased, $performer, [
                'reason' => 'warehouse_materials_released_to_production',
                'delay_reason' => $notes,
            ]);
        }
    }

    /**
     * @param  array<int, string>|null  $quantitiesByItemId
     * @return list<array<string, mixed>>
     */
    public function buildOffcutSummary(
        int $projectId,
        StockReservation $reservation,
        ?array $quantitiesByItemId = null,
    ): array {
        $summary = [];

        foreach ($reservation->lines as $line) {
            $item = $line->item;

            if (! $item || $item->category !== ItemCategory::AluminiumProfile) {
                continue;
            }

            if ($quantitiesByItemId !== null && ! array_key_exists((int) $line->item_id, $quantitiesByItemId)) {
                continue;
            }

            $remaining = $line->remainingQuantity();
            if ($quantitiesByItemId !== null) {
                $remaining = $quantitiesByItemId[(int) $line->item_id] ?? $remaining;
            }

            if (bccomp($remaining, '0', 3) !== 1) {
                continue;
            }

            $requiredLengthMm = $this->requiredLengthMmForLine($projectId, $line);

            $usableMetres = $requiredLengthMm > 0
                ? $this->offcuts->totalUsableMetres($item->id, $requiredLengthMm)
                : '0.000';

            $summary[] = [
                'item_id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'qty_to_release' => $remaining,
                'required_length_mm' => $requiredLengthMm,
                'offcut_metres_available' => $usableMetres,
                'note' => bccomp($usableMetres, '0', 3) === 1
                    ? 'Usable offcuts may reduce new bar usage; remaining length is issued from reserved stock.'
                    : 'No matching offcuts — full quantity from reserved warehouse stock.',
            ];
        }

        return $summary;
    }

    protected function requiredLengthMmForLine(int $projectId, StockReservationLine $line): int
    {
        $bomLine = \App\Models\ProjectBomLine::query()
            ->whereHas('bom', fn ($q) => $q->where('project_id', $projectId))
            ->when($line->bom_line_ref, fn ($q) => $q->where('id', $line->bom_line_ref))
            ->orderByDesc('id')
            ->first();

        return (int) ($bomLine?->measurement_mm ?? 0);
    }
}
