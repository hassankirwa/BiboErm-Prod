<?php

namespace App\Http\Controllers\Procurement\GlassOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GlassOrderResource;
use App\Models\Procurement\GlassOrder;
use App\Services\Procurement\Glass\GlassOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GlassOrderController extends Controller
{
    public function __construct(protected GlassOrderService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', GlassOrder::class);

        $query = GlassOrder::query()->with(['project', 'supplier'])->latest();
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        return GlassOrderResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', GlassOrder::class);

        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'specs' => ['required', 'array'],
            'expected_delivery' => ['nullable', 'date'],
            'delivery_location' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $order = $this->service->create($request->user(), $validated);

        return (new GlassOrderResource($order))->response()->setStatusCode(201);
    }

    public function show(GlassOrder $glassOrder): GlassOrderResource
    {
        $this->authorize('view', $glassOrder);

        return new GlassOrderResource($glassOrder->load(['project', 'supplier']));
    }

    public function update(Request $request, GlassOrder $glassOrder): GlassOrderResource
    {
        $this->authorize('update', $glassOrder);

        $validated = $request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'specs' => ['sometimes', 'array'],
            'expected_delivery' => ['nullable', 'date'],
            'delivery_location' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $glassOrder->update($validated);

        return new GlassOrderResource($glassOrder->fresh(['project', 'supplier']));
    }
}
