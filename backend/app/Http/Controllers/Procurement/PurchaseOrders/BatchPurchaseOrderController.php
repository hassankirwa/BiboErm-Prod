<?php

namespace App\Http\Controllers\Procurement\PurchaseOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseOrderResource;
use App\Models\Procurement\PurchaseOrder;
use App\Services\Procurement\PurchaseOrders\PurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BatchPurchaseOrderController extends Controller
{
    public function __construct(protected PurchaseOrderService $service) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseOrder::class);

        $validated = $request->validate([
            'groups' => ['required', 'array', 'min:1'],
            'groups.*.requisition_ids' => ['required', 'array', 'min:1'],
            'groups.*.requisition_ids.*' => ['integer', 'exists:purchase_requisitions,id'],
            'groups.*.supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'groups.*.project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'groups.*.expected_delivery' => ['nullable', 'date'],
            'groups.*.tax' => ['nullable', 'numeric', 'min:0'],
            'groups.*.lines' => ['required', 'array', 'min:1'],
            'groups.*.lines.*.description' => ['required', 'string'],
            'groups.*.lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'groups.*.lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'groups.*.lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'groups.*.lines.*.sku' => ['nullable', 'string'],
            'groups.*.lines.*.requisition_id' => ['nullable', 'integer', 'exists:purchase_requisitions,id'],
            'groups.*.lines.*.requisition_line_id' => ['nullable', 'integer', 'exists:purchase_requisition_lines,id'],
            'groups.*.transport' => ['nullable', 'array'],
            'groups.*.transport.transport_type' => ['required_with:groups.*.transport', 'string', 'max:30'],
            'groups.*.transport.driver_id' => ['nullable', 'integer', 'exists:procurement_drivers,id'],
            'groups.*.transport.vehicle' => ['nullable', 'string'],
            'groups.*.transport.driver_name' => ['nullable', 'string'],
            'groups.*.transport.driver_phone' => ['nullable', 'string'],
            'groups.*.transport.expected_arrival' => ['nullable', 'date'],
            'groups.*.transport.notes' => ['nullable', 'string'],
        ]);

        $orders = $this->service->createBatchFromDraftGroups($request->user(), $validated['groups']);

        return PurchaseOrderResource::collection(collect($orders))
            ->response()
            ->setStatusCode(201);
    }
}
