<?php

namespace App\Http\Controllers\Procurement\GoodsReceipts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GoodsReceiptResource;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\PurchaseOrder;
use App\Services\Procurement\GoodsReceipts\GoodsReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GoodsReceiptController extends Controller
{
    public function __construct(protected GoodsReceiptService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', GoodsReceipt::class);

        $query = GoodsReceipt::query()
            ->with(['purchaseOrder.supplier', 'purchaseOrder.lines', 'lines', 'creator'])
            ->latest();
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('purchase_order_id')) {
            $query->where('purchase_order_id', $request->integer('purchase_order_id'));
        }

        return GoodsReceiptResource::collection($query->paginate($request->integer('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', GoodsReceipt::class);

        $validated = $request->validate([
            'purchase_order_id' => ['required', 'integer', 'exists:purchase_orders,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'transport_order_id' => ['nullable', 'integer', 'exists:transport_orders,id'],
            'received_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'quality_inspection_notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.purchase_order_line_id' => ['required', 'integer', 'exists:purchase_order_lines,id'],
            'lines.*.qty_received' => ['required', 'numeric', 'min:0'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'lines.*.to_bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
            'lines.*.qty_accepted' => ['nullable', 'numeric', 'min:0'],
            'lines.*.qty_rejected' => ['nullable', 'numeric', 'min:0'],
            'lines.*.rejection_reason' => ['nullable', 'string'],
            'lines.*.notes' => ['nullable', 'string'],
        ]);

        $order = PurchaseOrder::query()->findOrFail($validated['purchase_order_id']);
        $grn = $this->service->create($order, $request->user(), $validated);

        return (new GoodsReceiptResource($grn))->response()->setStatusCode(201);
    }

    public function show(GoodsReceipt $goodsReceipt): GoodsReceiptResource
    {
        $this->authorize('view', $goodsReceipt);

        return new GoodsReceiptResource($this->service->loadForApi($goodsReceipt));
    }
}
