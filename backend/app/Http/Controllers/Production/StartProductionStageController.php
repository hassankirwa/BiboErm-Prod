<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\StartStageRequest;
use App\Http\Resources\Production\ProductionOrderResource;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionStageService;

class StartProductionStageController extends Controller
{
    public function __construct(
        protected ProductionStageService $stages,
    ) {}

    public function __invoke(StartStageRequest $request, ProductionOrder $order): ProductionOrderResource
    {
        $this->authorize('manageStages', $order);

        $this->stages->start(
            order: $order,
            stage: $request->stage(),
            user: $request->user(),
            notes: $request->validated('notes'),
        );

        return new ProductionOrderResource(
            $order->fresh(['project', 'stageLogs', 'teams.user', 'materialReleases'])
        );
    }
}
