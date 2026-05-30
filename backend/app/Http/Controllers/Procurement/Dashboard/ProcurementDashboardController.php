<?php

namespace App\Http\Controllers\Procurement\Dashboard;

use App\Enums\Procurement\GoodsReceiptStatus;
use App\Enums\Procurement\GlassOrderStatus;
use App\Enums\Procurement\PurchaseOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Http\Controllers\Controller;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\ProcurementDelay;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseRequisition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProcurementDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PurchaseRequisition::class);

        $pendingGrns = GoodsReceipt::query()
            ->whereIn('status', [GoodsReceiptStatus::Pending, GoodsReceiptStatus::Verifying])
            ->count();

        return response()->json([
            'data' => [
                'open_requisitions' => PurchaseRequisition::query()
                    ->whereIn('status', [RequisitionStatus::Draft, RequisitionStatus::PendingApproval])
                    ->count(),
                'pos_awaiting_approval' => PurchaseOrder::query()
                    ->whereIn('status', [PurchaseOrderStatus::Draft, PurchaseOrderStatus::PendingApproval])
                    ->count(),
                'pending_grns' => $pendingGrns,
                'glass_queue' => GlassOrder::query()
                    ->whereNotIn('status', [GlassOrderStatus::Delivered, GlassOrderStatus::Cancelled])
                    ->count(),
                'delays_this_week' => ProcurementDelay::query()
                    ->where('created_at', '>=', now()->startOfWeek())
                    ->count(),
            ],
        ]);
    }
}
