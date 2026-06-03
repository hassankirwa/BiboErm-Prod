<?php

namespace App\Http\Controllers\Procurement\PurchaseOrders;

use App\Http\Controllers\Controller;
use App\Models\Procurement\PurchaseOrder;
use Illuminate\Http\JsonResponse;

class PurchaseOrderPdfController extends Controller
{
    public function __invoke(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('view', $purchaseOrder);

        return response()->json([
            'message' => 'PDF generation not yet implemented.',
        ], 501);
    }
}
