<?php

namespace App\Services\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Models\Production\ProductionOrder;
use App\Services\Projects\ProjectMaterialStatusService;
use Illuminate\Database\Eloquent\Collection;

class ProductionScheduleService
{
    public function __construct(
        protected ProjectMaterialStatusService $materialStatus,
        protected ProductionOrderService $orders,
    ) {}

    /**
     * @return Collection<int, ProductionOrder>
     */
    public function calendarQueue(): Collection
    {
        $this->orders->syncOrdersForMaterialsReadyProjects();

        $orders = ProductionOrder::query()
            ->with(['project', 'teams.user', 'stageLogs'])
            ->whereIn('status', [
                ProductionOrderStatus::Scheduled,
                ProductionOrderStatus::InProgress,
                ProductionOrderStatus::OnHold,
            ])
            ->orderBy('fifo_position')
            ->orderBy('scheduled_start')
            ->get();

        foreach ($orders as $order) {
            if (! $order->project) {
                continue;
            }

            $status = $this->materialStatus->build($order->project);
            $summary = $status['summary'];

            $order->setAttribute('material_readiness', [
                'label' => $this->readinessLabel($summary),
                'shortage_lines' => $summary['shortage_lines'],
                'fully_reserved' => $summary['fully_reserved'],
                'total_lines' => $summary['total_lines'],
                'open_requisitions' => $summary['open_requisitions'],
            ]);

            $glassOrders = collect($status['glass_orders'] ?? []);
            $latestGlass = $glassOrders->first();

            $order->setAttribute('glass_status', $latestGlass ? [
                'status' => $latestGlass['status'] ?? null,
                'order_number' => $latestGlass['order_number'] ?? null,
                'pending_count' => $summary['glass_orders_pending'] ?? 0,
            ] : null);
        }

        return $orders;
    }

    /**
     * @param  array{shortage_lines: int, fully_reserved: int, total_lines: int, open_requisitions: int}  $summary
     */
    private function readinessLabel(array $summary): string
    {
        if (($summary['shortage_lines'] ?? 0) > 0) {
            return 'shortage';
        }

        if (($summary['open_requisitions'] ?? 0) > 0) {
            return 'procurement_pending';
        }

        if (($summary['total_lines'] ?? 0) > 0
            && ($summary['fully_reserved'] ?? 0) >= ($summary['total_lines'] ?? 0)) {
            return 'ready';
        }

        return 'partial';
    }
}
