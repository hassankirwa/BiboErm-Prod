<?php

namespace App\Http\Controllers\Procurement\GlassOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GlassOrderResource;
use App\Models\Procurement\GlassOrder;
use App\Services\Procurement\Glass\GlassOrderService;
use Illuminate\Http\Request;

class MarkGlassOrderOrderedController extends Controller
{
    public function __construct(protected GlassOrderService $service) {}

    public function __invoke(Request $request, GlassOrder $glassOrder): GlassOrderResource
    {
        $this->authorize('update', $glassOrder);

        return new GlassOrderResource($this->service->markOrdered($glassOrder, $request->user()));
    }
}
