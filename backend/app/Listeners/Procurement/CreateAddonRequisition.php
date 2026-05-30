<?php

namespace App\Listeners\Procurement;

use App\Enums\Procurement\RequisitionTrigger;
use App\Events\Projects\ProjectAddonRequested;
use App\Models\Procurement\ProjectAddonRequest;
use App\Models\User;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;

class CreateAddonRequisition
{
    public function __construct(protected PurchaseRequisitionService $requisitions) {}

    public function handle(ProjectAddonRequested $event): void
    {
        $user = User::query()->find($event->requestedByUserId) ?? User::query()->first();
        if (! $user) {
            return;
        }

        $requisition = $this->requisitions->createDraft($user, [
            'project_id' => $event->projectId,
            'notes' => 'Client addon request',
            'lines' => [[
                'description' => $event->description,
                'quantity' => 1,
                'trigger_type' => RequisitionTrigger::ClientAddon->value,
            ]],
        ], RequisitionTrigger::ClientAddon);

        ProjectAddonRequest::query()->create([
            'project_id' => $event->projectId,
            'purchase_requisition_id' => $requisition->id,
            'description' => $event->description,
            'client_requested' => $event->clientRequested,
            'status' => 'requisition_created',
            'requested_by' => $event->requestedByUserId,
        ]);
    }
}
