<?php

namespace App\Listeners\Warehouse;

use App\Events\Projects\ProjectBomFinalized;
use App\Models\User;
use App\Services\Warehouse\Reservations\ProjectMaterialReservationOrchestrator;

class HandleProjectBomFinalized
{
    public function __construct(
        protected ProjectMaterialReservationOrchestrator $orchestrator,
    ) {}

    public function handle(ProjectBomFinalized $event): void
    {
        if ($event->lineSummary === []) {
            return;
        }

        $user = User::query()->findOrFail($event->finalizedByUserId);
        $bomLines = ProjectMaterialReservationOrchestrator::normalizeBomLines($event->lineSummary);

        $this->orchestrator->process(
            projectId: $event->projectId,
            user: $user,
            bomLines: $bomLines,
            notes: "Auto-reserve after BOM #{$event->bomId} finalized",
            emitEvents: true,
        );
    }
}
