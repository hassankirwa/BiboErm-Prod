<?php

namespace App\Http\Controllers\Procurement\PurchaseOrders;

use App\Http\Controllers\Controller;
use App\Models\Procurement\PurchaseOrder;
use App\Services\Procurement\PurchaseOrders\PurchaseOrderDraftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrderDraftController extends Controller
{
    public function __construct(protected PurchaseOrderDraftService $drafts) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', PurchaseOrder::class);

        $validated = $request->validate([
            'requisition_ids' => ['required', 'array', 'min:1'],
            'requisition_ids.*' => ['integer', 'exists:purchase_requisitions,id'],
        ]);

        return response()->json([
            'data' => $this->drafts->buildFromRequisitions($validated['requisition_ids']),
        ]);
    }
}
