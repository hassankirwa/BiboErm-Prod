<?php

namespace App\Listeners\Procurement;

use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Services\Procurement\Requisitions\AutoDraftRequisitionService;

class DraftPurchaseRequisitionFromShortage
{
    public function __construct(protected AutoDraftRequisitionService $service) {}

    public function handle(ProjectMaterialShortageDetected $event): void
    {
        $this->service->fromShortage($event);
    }
}
