<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\SkipStageRequest;
use App\Http\Resources\Production\ProductionOrderResource;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionStageService;

class SkipProductionStageController extends Controller
{
    public function __construct(
        protected ProductionStageService $stages,
    ) {}

    public function __invoke(SkipStageRequest $request, ProductionOrder $order): ProductionOrderResource
    {
        $this->authorize('manageStages', $order);

        $this->stages->skip(
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
