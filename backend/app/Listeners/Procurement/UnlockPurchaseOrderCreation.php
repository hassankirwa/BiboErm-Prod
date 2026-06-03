<?php

namespace App\Listeners\Procurement;

use App\Events\Procurement\PurchaseRequisitionApproved;
use Illuminate\Support\Facades\Cache;

class UnlockPurchaseOrderCreation
{
    public function handle(PurchaseRequisitionApproved $event): void
    {
        Cache::put(
            $this->cacheKey($event->purchaseRequisitionId),
            now()->toIso8601String(),
            now()->addDays(30)
        );
    }

    protected function cacheKey(int $purchaseRequisitionId): string
    {
        return "procurement:purchase-order-unlocked:{$purchaseRequisitionId}";
    }
}
