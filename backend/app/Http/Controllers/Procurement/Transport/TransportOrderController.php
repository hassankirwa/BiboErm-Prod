<?php

namespace App\Http\Controllers\Procurement\Transport;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\TransportOrderResource;
use App\Models\Procurement\TransportOrder;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TransportOrderController extends Controller
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', TransportOrder::class);

        return TransportOrderResource::collection(
            TransportOrder::query()->with('purchaseOrder')->latest()->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', TransportOrder::class);

        $validated = $request->validate([
            'purchase_order_id' => ['required', 'integer', 'exists:purchase_orders,id'],
            'transport_type' => ['required', 'string', 'max:30'],
            'vehicle' => ['nullable', 'string'],
            'driver_name' => ['nullable', 'string'],
            'driver_phone' => ['nullable', 'string'],
            'expected_arrival' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $order = TransportOrder::query()->create([
            ...$validated,
            'transport_number' => $this->refs->transport(),
            'status' => 'scheduled',
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('transport.scheduled', $order);

        return (new TransportOrderResource($order))->response()->setStatusCode(201);
    }
}
