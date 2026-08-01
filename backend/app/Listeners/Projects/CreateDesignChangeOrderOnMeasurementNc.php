<?php

namespace App\Listeners\Projects;

use App\Enums\FieldInstallation\NonConformityType;
use App\Events\FieldInstallation\FieldNonConformityReported;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\User;
use App\Services\Projects\DesignChangeOrderService;
use Illuminate\Support\Facades\Log;

class CreateDesignChangeOrderOnMeasurementNc
{
    public function __construct(
        protected DesignChangeOrderService $designChanges,
    ) {}

    public function handle(FieldNonConformityReported $event): void
    {
        $nc = FieldNonConformity::query()->find($event->nonConformityId);

        if (! $nc) {
            return;
        }

        $ncType = $nc->nc_type instanceof NonConformityType
            ? $nc->nc_type
            : NonConformityType::tryFrom((string) $nc->nc_type);

        if (! in_array($ncType, [
            NonConformityType::WrongMeasurement,
            NonConformityType::DimensionMismatch,
        ], true)) {
            return;
        }

        $actor = User::query()->find($event->reportedByUserId);

        if (! $actor) {
            Log::warning('Skipped auto DCO: reporter missing', [
                'non_conformity_id' => $event->nonConformityId,
                'reported_by' => $event->reportedByUserId,
            ]);

            return;
        }

        try {
            $this->designChanges->createFromNonConformity($nc, $actor);
        } catch (\Throwable $e) {
            Log::error('Auto design-change order failed after measurement NC', [
                'non_conformity_id' => $nc->id,
                'project_id' => $nc->project_id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
