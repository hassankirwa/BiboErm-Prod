<?php

namespace App\Listeners\Warehouse;

use App\Events\Projects\ProjectBomFinalized;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Models\Project;
use App\Services\Warehouse\Reservations\BomStockCheckService;
use App\Services\Warehouse\Reservations\FifoQueueDemandRegistry;
use App\Services\Warehouse\Reservations\MaterialCheckSnapshotService;
use App\Services\Warehouse\Reservations\ProjectMaterialReservationOrchestrator;
use App\Services\Warehouse\WarehouseAuditLogger;

class HandleProjectBomFinalized
{
    public function __construct(
        protected BomStockCheckService $bomStockCheck,
        protected FifoQueueDemandRegistry $demandRegistry,
        protected WarehouseAuditLogger $audit,
        protected MaterialCheckSnapshotService $materialCheckSnapshot,
    ) {}

    public function handle(ProjectBomFinalized $event): void
    {
        if ($event->lineSummary === []) {
            return;
        }

        $project = Project::query()->find($event->projectId);

        if (! $project) {
            return;
        }

        $bomLines = ProjectMaterialReservationOrchestrator::normalizeBomLines($event->lineSummary);

        $this->demandRegistry->record($event->projectId, $bomLines);

        $check = $this->bomStockCheck->check($event->projectId, $bomLines);

        $this->materialCheckSnapshot->store($project, $check);

        if (! $check['can_fully_reserve']) {
            $this->emitShortage($event->projectId, $check);

            return;
        }

        $this->audit->materialCheckPassed($event->projectId, [
            'bom_id' => $event->bomId,
            'line_count' => count($check['lines'] ?? []),
        ]);
    }

    /**
     * @param  array<string, mixed>  $check
     */
    protected function emitShortage(int $projectId, array $check): void
    {
        $shortageLines = collect($check['lines'] ?? [])
            ->filter(fn (array $line) => bccomp((string) ($line['shortage'] ?? '0'), '0', 3) === 1)
            ->map(fn (array $line) => [
                'project_bom_line_id' => $line['project_bom_line_id'] ?? null,
                'warehouse_item_id' => $line['item_id'],
                'qty_required' => (string) $line['required'],
                'qty_available' => (string) ($line['effective_available'] ?? '0'),
                'qty_short' => (string) $line['shortage'],
            ])
            ->values()
            ->all();

        event(new ProjectMaterialShortageDetected(
            projectId: $projectId,
            reservationId: null,
            shortageLines: $shortageLines,
        ));

        $this->audit->shortageDetected($projectId, [
            'reservation_id' => null,
            'lines' => $shortageLines,
        ]);
    }
}
