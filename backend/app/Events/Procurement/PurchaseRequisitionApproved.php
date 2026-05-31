<?php

namespace App\Events\Procurement;

use App\Enums\Procurement\RequisitionTrigger;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PurchaseRequisitionApproved
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $purchaseRequisitionId,
        public ?int $projectId,
        public int $approvedByUserId,
        public RequisitionTrigger $trigger,
    ) {}
}
