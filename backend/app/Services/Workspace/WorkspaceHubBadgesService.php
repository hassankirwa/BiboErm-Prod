<?php

namespace App\Services\Workspace;

use App\Enums\Procurement\GoodsReceiptStatus;
use App\Enums\Procurement\PurchaseOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Production\ProductionOrderStatus;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use App\Services\Warehouse\Inventory\LowStockAlertService;
use Carbon\Carbon;

class WorkspaceHubBadgesService
{
    public function __construct(
        protected LowStockAlertService $lowStock,
    ) {}

    /**
     * Live badge counts for workspace app tiles the user is allowed to see.
     *
     * @return array<string, array{count: int, label: string, className: string}>
     */
    public function badgesFor(User $user, ?Carbon $asOf = null): array
    {
        $today = ($asOf ?? Carbon::today())->toDateString();
        $badges = [];

        if ($user->can('warehouse.stock.view')) {
            $count = $this->lowStock->countAlerts();
            if ($count > 0) {
                $badges['warehouse'] = [
                    'count' => $count,
                    'label' => $count === 1 ? '1 Low Stock' : "{$count} Low Stock",
                    'className' => 'text-orange-600',
                ];
            }
        }

        if ($user->can('procurement.view') || $user->can('procurement.dashboard.view')) {
            $count = $this->procurementPendingCount();
            if ($count > 0) {
                $badges['procurement'] = [
                    'count' => $count,
                    'label' => $count === 1 ? '1 Pending' : "{$count} Pending",
                    'className' => 'text-teal-600',
                ];
            }
        }

        if ($user->can('production.view') || $user->can('production.manage')) {
            $count = ProductionOrder::query()
                ->whereIn('status', [
                    ProductionOrderStatus::Scheduled,
                    ProductionOrderStatus::InProgress,
                ])
                ->whereDate('scheduled_start', $today)
                ->count();

            if ($count > 0) {
                $badges['dispatch'] = [
                    'count' => $count,
                    'label' => $count === 1 ? '1 Today' : "{$count} Today",
                    'className' => 'text-indigo-600',
                ];
            }
        }

        if ($user->can('finance.view') || $user->can('payroll.view')) {
            $count = Invoice::query()->overdue()->count();
            if ($count > 0) {
                $badges['finance'] = [
                    'count' => $count,
                    'label' => $count === 1 ? '1 Overdue' : "{$count} Overdue",
                    'className' => 'text-green-600',
                ];
            }
        }

        if ($user->can('employees.view') || $user->can('leave.review')) {
            $count = LeaveRequest::query()
                ->where('status', LeaveRequest::STATUS_APPROVED)
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->distinct()
                ->count('user_id');

            if ($count > 0) {
                $badges['hr'] = [
                    'count' => $count,
                    'label' => $count === 1 ? '1 On Leave' : "{$count} On Leave",
                    'className' => 'text-rose-600',
                ];
            }
        }

        return $badges;
    }

    protected function procurementPendingCount(): int
    {
        $openRequisitions = PurchaseRequisition::query()
            ->whereIn('status', [RequisitionStatus::Draft, RequisitionStatus::PendingApproval])
            ->count();

        $posAwaitingApproval = PurchaseOrder::query()
            ->whereIn('status', [PurchaseOrderStatus::Draft, PurchaseOrderStatus::PendingApproval])
            ->count();

        $pendingGrns = GoodsReceipt::query()
            ->whereIn('status', [GoodsReceiptStatus::Pending, GoodsReceiptStatus::Verifying])
            ->count();

        return $openRequisitions + $posAwaitingApproval + $pendingGrns;
    }
}
