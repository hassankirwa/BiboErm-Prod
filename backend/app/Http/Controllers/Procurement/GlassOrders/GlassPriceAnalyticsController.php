<?php

namespace App\Http\Controllers\Procurement\GlassOrders;

use App\Http\Controllers\Controller;
use App\Models\Procurement\GlassOrder;
use App\Services\Procurement\Glass\GlassPriceAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlassPriceAnalyticsController extends Controller
{
    public function __construct(protected GlassPriceAnalyticsService $analytics) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', GlassOrder::class);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from']) : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to']) : null;

        return response()->json([
            'data' => $this->analytics->summary($from, $to),
        ]);
    }
}
