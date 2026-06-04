<?php

namespace App\Listeners\Production;

use App\Events\Warehouse\ProjectMaterialsReady;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use App\Notifications\Production\ProductionOrderCreatedNotification;

class NotifyProductionManagersOfNewOrder
{
    public function handle(ProjectMaterialsReady $event): void
    {
        $order = ProductionOrder::query()
            ->with('project')
            ->where('project_id', $event->projectId)
            ->latest('id')
            ->first();

        if (! $order) {
            return;
        }

        $notification = new ProductionOrderCreatedNotification(
            productionOrderId: $order->id,
            reference: $order->reference,
            projectId: $order->project_id,
            projectName: $order->project?->name ?? "Project #{$order->project_id}",
            fifoPosition: $order->fifo_position,
        );

        User::query()
            ->role('production_manager')
            ->where('status', User::STATUS_ACTIVE)
            ->each(fn (User $user) => $user->notify($notification));
    }
}
