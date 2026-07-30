<?php

namespace App\Http\Controllers\Procurement\Transport;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\TransportOrderResource;
use App\Models\Procurement\Driver;
use App\Models\Procurement\TransportOrder;
use App\Services\Procurement\DriverOccupancyService;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransportOrderController extends Controller
{
    protected const STATUSES = ['scheduled', 'in_transit', 'arrived'];

    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
        protected DriverOccupancyService $occupancy,
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
            'status' => ['nullable', 'string', 'in:'.implode(',', self::STATUSES)],
        ]);

        $status = $validated['status'] ?? 'scheduled';

        if ($status === 'in_transit' && empty($validated['driver_id'])) {
            throw ValidationException::withMessages([
                'driver_id' => ['A driver is required when transport is in transit.'],
            ]);
        }

        $driverDetails = $this->resolveDriverDetails($validated);

        $order = DB::transaction(function () use ($request, $validated, $driverDetails, $status) {
            $order = TransportOrder::query()->create([
                ...$validated,
                ...$driverDetails,
                'transport_number' => $this->refs->transport(),
                'status' => $status,
                'created_by' => $request->user()->id,
            ]);

            if ($status === 'in_transit' && $order->driver_id) {
                $driver = Driver::query()->findOrFail($order->driver_id);
                $this->occupancy->occupy($driver, 'transport_order');
            }

            $this->audit->log('transport.scheduled', $order);

            return $order;
        });

        return (new TransportOrderResource($order))->response()->setStatusCode(201);
    }

    public function updateStatus(Request $request, TransportOrder $transportOrder): TransportOrderResource
    {
        $this->authorize('update', $transportOrder);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', self::STATUSES)],
            'actual_arrival' => ['nullable', 'date'],
            'driver_id' => ['nullable', 'integer', 'exists:procurement_drivers,id'],
            'driver_name' => ['nullable', 'string'],
            'driver_phone' => ['nullable', 'string'],
            'vehicle' => ['nullable', 'string'],
        ]);

        $newStatus = $validated['status'];
        $driverId = $validated['driver_id'] ?? $transportOrder->driver_id;

        if ($newStatus === 'in_transit' && empty($driverId)) {
            throw ValidationException::withMessages([
                'driver_id' => ['A driver is required when transport is in transit.'],
            ]);
        }

        $oldValues = [
            'status' => $transportOrder->status,
            'actual_arrival' => $transportOrder->actual_arrival?->toIso8601String(),
            'driver_id' => $transportOrder->driver_id,
        ];

        $order = DB::transaction(function () use ($transportOrder, $validated, $newStatus, $driverId) {
            $previousStatus = $transportOrder->status;
            $updates = [
                'status' => $newStatus,
                'actual_arrival' => $newStatus === 'arrived'
                    ? ($validated['actual_arrival'] ?? now())
                    : $transportOrder->actual_arrival,
            ];

            if ($newStatus === 'in_transit' && $previousStatus !== 'in_transit') {
                $driverDetails = $this->resolveDriverDetails([
                    'driver_id' => $driverId,
                    'driver_name' => $validated['driver_name'] ?? $transportOrder->driver_name,
                    'driver_phone' => $validated['driver_phone'] ?? $transportOrder->driver_phone,
                    'vehicle' => $validated['vehicle'] ?? $transportOrder->vehicle,
                ]);
                $updates = [...$updates, ...$driverDetails];

                $driver = Driver::query()->findOrFail($driverId);
                $this->occupancy->occupy($driver, 'transport_order');
            }

            if ($newStatus === 'arrived' && $previousStatus === 'in_transit' && $transportOrder->driver_id) {
                $driver = Driver::query()->find($transportOrder->driver_id);
                if ($driver) {
                    $this->occupancy->release($driver);
                }
            }

            $transportOrder->update($updates);

            return $transportOrder->fresh(['purchaseOrder', 'driver']);
        });

        $this->audit->log('transport.status_updated', $order, $oldValues, [
            'status' => $order->status,
            'actual_arrival' => $order->actual_arrival?->toIso8601String(),
            'driver_id' => $order->driver_id,
        ]);

        return new TransportOrderResource($order);
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

        $this->occupancy->assertAvailable($driver);

        return [
            'driver_id' => $driver->id,
            'driver_name' => $validated['driver_name'] ?? $driver->name,
            'driver_phone' => $validated['driver_phone'] ?? $driver->phone,
            'vehicle' => $validated['vehicle'] ?? $driver->vehicle_registration,
        ];
    }
}
