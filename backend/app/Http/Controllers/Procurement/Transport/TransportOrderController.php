<?php

namespace App\Http\Controllers\Procurement\Transport;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\TransportOrderResource;
use App\Models\Procurement\Driver;
use App\Models\Procurement\TransportOrder;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TransportOrderController extends Controller
{
    protected const STATUSES = ['scheduled', 'in_transit', 'arrived'];

    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', TransportOrder::class);

        return TransportOrderResource::collection(
            TransportOrder::query()->with(['purchaseOrder', 'driver'])->latest()->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', TransportOrder::class);

        $validated = $request->validate([
            'purchase_order_id' => ['required', 'integer', 'exists:purchase_orders,id'],
            'transport_type' => ['required', 'string', 'max:30'],
            'vehicle' => ['nullable', 'string'],
            'driver_id' => ['nullable', 'integer', 'exists:procurement_drivers,id'],
            'driver_name' => ['nullable', 'string'],
            'driver_phone' => ['nullable', 'string'],
            'expected_arrival' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $driverDetails = $this->resolveDriverDetails($validated);

        $order = TransportOrder::query()->create([
            ...$validated,
            ...$driverDetails,
            'transport_number' => $this->refs->transport(),
            'status' => 'scheduled',
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('transport.scheduled', $order);

        return (new TransportOrderResource($order))->response()->setStatusCode(201);
    }

    public function updateStatus(Request $request, TransportOrder $transportOrder): TransportOrderResource
    {
        $this->authorize('update', $transportOrder);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', self::STATUSES)],
            'actual_arrival' => ['nullable', 'date'],
        ]);

        $oldValues = [
            'status' => $transportOrder->status,
            'actual_arrival' => $transportOrder->actual_arrival?->toIso8601String(),
        ];

        $transportOrder->update([
            'status' => $validated['status'],
            'actual_arrival' => $validated['status'] === 'arrived'
                ? ($validated['actual_arrival'] ?? now())
                : null,
        ]);

        $this->audit->log('transport.status_updated', $transportOrder, $oldValues, [
            'status' => $transportOrder->status,
            'actual_arrival' => $transportOrder->actual_arrival?->toIso8601String(),
        ]);

        return new TransportOrderResource($transportOrder->fresh(['purchaseOrder', 'driver']));
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function resolveDriverDetails(array $validated): array
    {
        if (empty($validated['driver_id'])) {
            return [];
        }

        $driver = Driver::query()
            ->whereKey($validated['driver_id'])
            ->where('is_active', true)
            ->firstOrFail();

        return [
            'driver_id' => $driver->id,
            'driver_name' => $validated['driver_name'] ?? $driver->name,
            'driver_phone' => $validated['driver_phone'] ?? $driver->phone,
            'vehicle' => $validated['vehicle'] ?? $driver->vehicle_registration,
        ];
    }
}
