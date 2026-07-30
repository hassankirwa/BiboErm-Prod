<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\CompleteStageRequest;
use App\Http\Resources\Production\ProductionOrderResource;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionStageService;

class CompleteProductionStageController extends Controller
{
    public function __construct(
        protected ProductionStageService $stages,
    ) {}

    public function __invoke(CompleteStageRequest $request, ProductionOrder $order): ProductionOrderResource
    {
        $this->authorize('manageStages', $order);

        $validated = $request->validated();

        $this->stages->complete(
            order: $order,
            stage: $request->stage(),
            user: $request->user(),
            notes: $validated['notes'] ?? null,
            offcuts: $validated['offcuts'] ?? null,
            evidenceFiles: $request->evidenceFiles(),
            discardWasteLineIds: $validated['discard_waste_line_ids'] ?? [],
        );

        return new ProductionOrderResource(
            $order->fresh(['project', 'stageLogs', 'teams.user'])
        );
    }
}
