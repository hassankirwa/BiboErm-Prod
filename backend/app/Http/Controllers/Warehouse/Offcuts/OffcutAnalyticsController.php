<?php

namespace App\Http\Controllers\Warehouse\Offcuts;

use App\Http\Controllers\Controller;
use App\Services\Warehouse\Offcuts\OffcutAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class OffcutAnalyticsController extends Controller
{
    public function __construct(
        protected OffcutAnalyticsService $analytics,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : null;
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : null;

        return response()->json([
            'data' => $this->analytics->report($from, $to),
        ]);
    }
}
