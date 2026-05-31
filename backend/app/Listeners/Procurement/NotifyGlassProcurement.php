<?php

namespace App\Listeners\Procurement;

use App\Events\Production\ProductionStageCompleted;
use App\Models\User;
use App\Services\Procurement\Glass\GlassOrderService;

class NotifyGlassProcurement
{
    public function __construct(protected GlassOrderService $glassOrders) {}

    public function handle(ProductionStageCompleted $event): void
    {
        if ($event->productionStage !== 'fabrication') {
            return;
        }

        $user = User::query()->first();
        if (! $user) {
            return;
        }

        $existing = \App\Models\Procurement\GlassOrder::query()
            ->where('project_id', $event->projectId)
            ->whereNotIn('status', ['delivered', 'cancelled'])
            ->exists();

        if ($existing) {
            return;
        }

        $this->glassOrders->create($user, [
            'project_id' => $event->projectId,
            'specs' => ['source' => 'production_fabrication_complete'],
            'notes' => 'Auto-created from production fabrication stage',
        ]);
    }
}
