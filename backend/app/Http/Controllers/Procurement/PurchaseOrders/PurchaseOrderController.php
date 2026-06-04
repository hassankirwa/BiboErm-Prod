<?php

namespace App\Http\Controllers\Procurement\PurchaseOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseOrderResource;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Services\Procurement\PurchaseOrders\PurchaseOrderService;
use App\Services\Procurement\ProcurementWarehouseItemResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PurchaseOrderController extends Controller
{
    public function __construct(
        protected PurchaseOrderService $service,
        protected ProcurementWarehouseItemResolver $warehouseItems,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PurchaseOrder::class);

        $query = PurchaseOrder::query()
            ->with(['supplier', 'project', 'lines', 'transportOrders.driver'])
            ->withCount('goodsReceipts')
            ->latest();

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('without_goods_receipts')) {
            $query->whereDoesntHave('goodsReceipts');
        }

        return PurchaseOrderResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseOrder::class);

        $validated = $request->validate([
            'requisition_id' => ['required', 'integer', 'exists:purchase_requisitions,id'],
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'expected_delivery' => ['nullable', 'date'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'lines.*.sku' => ['nullable', 'string'],
            'transport' => ['nullable', 'array'],
            'transport.transport_type' => ['required_with:transport', 'string', 'max:30'],
            'transport.driver_id' => ['nullable', 'integer', 'exists:procurement_drivers,id'],
            'transport.vehicle' => ['nullable', 'string'],
            'transport.driver_name' => ['nullable', 'string'],
            'transport.driver_phone' => ['nullable', 'string'],
            'transport.expected_arrival' => ['nullable', 'date'],
            'transport.notes' => ['nullable', 'string'],
        ]);

        $requisition = PurchaseRequisition::query()->findOrFail($validated['requisition_id']);
        $order = $this->service->createFromRequisition($requisition, $request->user(), $validated);

        return (new PurchaseOrderResource($order))->response()->setStatusCode(201);
    }

    public function show(PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        $this->authorize('view', $purchaseOrder);

        $this->warehouseItems->syncPurchaseOrderFromRequisition($purchaseOrder);

        $purchaseOrder = $purchaseOrder->fresh([
            'supplier',
            'project',
            'lines',
            'requisition',
            'transportOrders.driver',
        ]);
        $purchaseOrder->loadCount('goodsReceipts');

        return new PurchaseOrderResource($purchaseOrder);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        $this->authorize('update', $purchaseOrder);

        $validated = $request->validate([
            'expected_delivery' => ['nullable', 'date'],
            'tax' => ['nullable', 'numeric', 'min:0'],
        ]);

        $purchaseOrder->update($validated);

        return new PurchaseOrderResource($purchaseOrder->fresh(['supplier', 'lines']));
    }
}
