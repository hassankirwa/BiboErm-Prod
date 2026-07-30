<?php

namespace App\Listeners\Warehouse;

use App\Events\Warehouse\ToolReplacementRequired;
use App\Models\Warehouse\ToolIssuance;
use App\Services\Warehouse\Tools\ToolIncidentService;

class CreateToolIncidentOnReplacementRequired
{
    public function __construct(
        protected ToolIncidentService $incidents,
    ) {}

    public function handle(ToolReplacementRequired $event): void
    {
        $issuance = ToolIssuance::query()
            ->with(['tool', 'issuedToUser', 'issuedByUser', 'fieldToolAssignment'])
            ->find($event->issuanceId);

        if (! $issuance) {
            return;
        }

        $existing = $issuance->tool->incidents()
            ->where('issuance_id', $issuance->id)
            ->whereIn('status', ['open', 'in_repair'])
            ->exists();

        if ($existing) {
            return;
        }

        $this->incidents->reportFromIssuance(
            issuance: $issuance,
            conditionIn: $event->conditionIn,
            damageNotes: $event->damageNotes,
        );
    }
}
