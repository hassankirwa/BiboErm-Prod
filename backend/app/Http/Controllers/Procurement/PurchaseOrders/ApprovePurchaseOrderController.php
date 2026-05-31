<?php

namespace App\Http\Controllers\Procurement\PurchaseOrders;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseOrderResource;
use App\Models\Procurement\PurchaseOrder;
use App\Services\Procurement\PurchaseOrders\PurchaseOrderService;
use Illuminate\Http\Request;

class ApprovePurchaseOrderController extends Controller
{
    public function __construct(protected PurchaseOrderService $service) {}

    public function __invoke(Request $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        $this->authorize('approve', $purchaseOrder);

        return new PurchaseOrderResource($this->service->approve($purchaseOrder, $request->user()));
    }
}
