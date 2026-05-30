<?php

namespace App\Http\Controllers\Procurement\Requisitions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseRequisitionResource;
use App\Models\Procurement\PurchaseRequisition;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use Illuminate\Http\Request;

class RejectPurchaseRequisitionController extends Controller
{
    public function __construct(protected PurchaseRequisitionService $service) {}

    public function __invoke(Request $request, PurchaseRequisition $requisition): PurchaseRequisitionResource
    {
        $this->authorize('approve', $requisition);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return new PurchaseRequisitionResource(
            $this->service->reject($requisition, $request->user(), $validated['reason'])
        );
    }
}
