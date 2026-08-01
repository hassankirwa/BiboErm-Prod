<?php

namespace App\Services\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\ProjectStage;
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
            $projectStage = $order->project->stage?->value ?? $order->project->stage;

            $order->setAttribute('material_readiness', [
                'label' => $this->readinessLabel($summary, is_string($projectStage) ? $projectStage : null),
                'shortage_lines' => $summary['shortage_lines'],
                'fully_reserved' => $summary['fully_reserved'],
                'total_lines' => $summary['total_lines'],
                'open_requisitions' => $summary['open_requisitions'],
                'reservation_complete' => (bool) ($summary['reservation_complete'] ?? false),
                'materials_released_lines' => (int) ($summary['materials_released_lines'] ?? 0),
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
     * @param  array<string, mixed>  $summary
     */
    private function readinessLabel(array $summary, ?string $projectStage = null): string
    {
        if ($this->materialsHaveBeenReleased($summary, $projectStage)) {
            return 'released';
        }

        if (($summary['shortage_lines'] ?? 0) > 0) {
            return 'shortage';
        }

        if (($summary['open_requisitions'] ?? 0) > 0) {
            return 'procurement_pending';
        }

        if (! empty($summary['reservation_complete'])) {
            return 'ready';
        }

        $unitsTotal = (int) ($summary['reservation_units_total'] ?? 0);
        $unitsReserved = (int) ($summary['reservation_units_reserved'] ?? 0);
        if ($unitsTotal > 0 && $unitsReserved >= $unitsTotal) {
            return 'ready';
        }

        if (($summary['total_lines'] ?? 0) > 0
            && ($summary['fully_reserved'] ?? 0) >= ($summary['total_lines'] ?? 0)) {
            return 'ready';
        }

        return 'partial';
    }

    /**
     * @param  array<string, mixed>  $summary
     */
    private function materialsHaveBeenReleased(array $summary, ?string $projectStage): bool
    {
        if (($summary['materials_released_lines'] ?? 0) > 0) {
            return true;
        }

        if ($projectStage === null || $projectStage === '') {
            return false;
        }

        $releasedOrLater = [
            ProjectStage::MaterialsReleased->value,
            ProjectStage::CuttingStage->value,
            ProjectStage::FabricationStage->value,
            ProjectStage::GlassAssembly->value,
            ProjectStage::QcPreInstallation->value,
            ProjectStage::InTransit->value,
            ProjectStage::Installation->value,
            ProjectStage::SiteQc->value,
            ProjectStage::Snagging->value,
            ProjectStage::ProjectComplete->value,
        ];

        return in_array($projectStage, $releasedOrLater, true);
    }
}
