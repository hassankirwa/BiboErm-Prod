<?php

namespace App\Listeners\Warehouse;

use App\Events\Warehouse\WarehouseLowStockDetected;
use App\Models\User;
use App\Notifications\Warehouse\LowStockNotification;

class NotifyProcurementOfficersOfLowStock
{
    public function handle(WarehouseLowStockDetected $event): void
    {
        $notification = new LowStockNotification(
            warehouseItemId: $event->warehouseItemId,
            sku: $event->sku,
            name: $event->name,
            availableQty: $event->availableQty,
            minStockQty: $event->minStockQty,
        );

        User::query()
            ->role('procurement_officer')
            ->where('status', User::STATUS_ACTIVE)
            ->each(fn (User $user) => $user->notify($notification));
    }
}
