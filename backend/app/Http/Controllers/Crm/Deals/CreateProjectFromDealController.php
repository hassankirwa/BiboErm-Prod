<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Services\Crm\Deals\DealToProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreateProjectFromDealController extends Controller
{
    public function __construct(
        protected DealToProjectService $dealToProjectService,
    ) {}

    public function __invoke(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('update', $deal);

        $result = $this->dealToProjectService->createFromDeal($deal, $request->user());

        return response()->json([
            'data' => [
                'deal' => new DealResource($result['deal']),
                'project' => $result['project'],
            ],
        ], 201);
    }
}
