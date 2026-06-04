<?php

namespace App\Http\Controllers\Production;

use App\Http\Controllers\Controller;
use App\Http\Requests\Production\StoreProductionOffcutsRequest;
use App\Models\Production\ProductionOrder;
use App\Services\Production\ProductionStageService;
use Illuminate\Http\JsonResponse;

class LogProductionOffcutsController extends Controller
{
    public function __construct(
        protected ProductionStageService $stages,
    ) {}

    public function __invoke(StoreProductionOffcutsRequest $request, ProductionOrder $order): JsonResponse
    {
        $this->authorize('manageStages', $order);

        $this->stages->logOffcuts(
            order: $order,
            user: $request->user(),
            offcuts: $request->validated('offcuts'),
        );

        return response()->json(['success' => true]);
    }
}
