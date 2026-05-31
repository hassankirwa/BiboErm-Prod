<?php

namespace App\Http\Controllers\Procurement\Requisitions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\PurchaseRequisitionResource;
use App\Models\Procurement\PurchaseRequisition;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use Illuminate\Http\Request;

class ApprovePurchaseRequisitionController extends Controller
{
    public function __construct(protected PurchaseRequisitionService $service) {}

    public function __invoke(Request $request, PurchaseRequisition $requisition): PurchaseRequisitionResource
    {
        $this->authorize('approve', $requisition);

        return new PurchaseRequisitionResource(
            $this->service->approve($requisition, $request->user())
        );
    }
}
