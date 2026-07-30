<?php

namespace App\Http\Controllers\Procurement\GlassOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GlassOrderResource;
use App\Models\Procurement\GlassOrder;
use App\Services\Procurement\Glass\GlassOrderService;
use Illuminate\Http\Request;

class MarkGlassOrderDeliveredController extends Controller
{
    public function __construct(protected GlassOrderService $service) {}

    public function __invoke(Request $request, GlassOrder $glassOrder): GlassOrderResource
    {
        $this->authorize('update', $glassOrder);

        $validated = $request->validate([
            'currency' => ['sometimes', 'string', 'size:3'],
            'panes' => ['required', 'array', 'min:1'],
            'panes.*.unit_buying_price' => ['required', 'numeric', 'min:0'],
        ]);

        return new GlassOrderResource(
            $this->service->markDelivered(
                $glassOrder,
                $validated['panes'],
                strtoupper($validated['currency'] ?? 'KES'),
            )
        );
    }
}
