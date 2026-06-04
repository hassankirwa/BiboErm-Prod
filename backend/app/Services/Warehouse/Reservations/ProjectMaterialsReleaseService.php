<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\ProjectStage;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Services\Projects\ProjectStageService;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectMaterialsReleaseService
{
    public function __construct(
        protected OffcutAllocationService $offcuts,
        protected ProjectStageService $stages,
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * Confirm reserved stock is ready for production pickup and advance to materials_released.
     *
     * Does not consume reservations — production fetches (stage release / transfer) per pipeline stage.
     *
     * @return array{
     *     reservation: StockReservation,
     *     movement_id: int|null,
     *     offcut_lines: list<array<string, mixed>>,
     *     project_stage: string
     * }
     */
    public function releaseForProduction(Project $project, User $performer, ?string $notes = null): array
    {
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

        if (! in_array($currentStage, [ProjectStage::MaterialsReady, ProjectStage::MaterialsReleased], true)) {
            throw ValidationException::withMessages([
                'stage' => ['Materials can only be released when the project is at materials ready.'],
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

        $offcutLines = $this->buildOffcutSummary($project->id, $reservation);

        return DB::transaction(function () use ($project, $performer, $notes, $reservation, $offcutLines) {
            if ($this->stages->canTransition($project->fresh(), ProjectStage::MaterialsReleased)) {
                $this->stages->transition($project->fresh(), ProjectStage::MaterialsReleased, $performer, [
                    'reason' => 'warehouse_materials_staged_for_production',
                    'delay_reason' => $notes,
                ]);
            }

            $this->audit->materialsStagedForProduction($project->id, [
                'reservation_id' => $reservation->id,
                'notes' => $notes,
            ]);

            return [
                'reservation' => $reservation->fresh(['lines.item', 'lines.bin', 'project']),
                'movement_id' => null,
                'offcut_lines' => $offcutLines,
                'project_stage' => ProjectStage::MaterialsReleased->value,
            ];
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildOffcutSummary(int $projectId, StockReservation $reservation): array
    {
        $summary = [];

        foreach ($reservation->lines as $line) {
            $item = $line->item;

            if (! $item || $item->category !== ItemCategory::AluminiumProfile) {
                continue;
            }

            $remaining = $line->remainingQuantity();

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
