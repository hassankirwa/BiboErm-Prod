<?php

namespace App\Services\Projects;

use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\Warehouse\StockReservation;

class ProjectMaterialStatusService
{
    /**
     * @return array<string, mixed>
     */
    public function build(Project $project): array
    {
        $bom = ProjectBom::query()
            ->where('project_id', $project->id)
            ->with(['lines.warehouseItem'])
            ->orderByDesc('version')
            ->first();

        $reservations = StockReservation::query()
            ->where('project_id', $project->id)
            ->with('lines')
            ->orderByDesc('reserved_at')
            ->get();

        $requisitionLines = PurchaseRequisitionLine::query()
            ->whereHas('requisition', fn ($query) => $query->where('project_id', $project->id))
            ->with('requisition')
            ->get();

        $glassOrders = GlassOrder::query()
            ->where('project_id', $project->id)
            ->get();

        $reservedByRef = [];
        $reservedByItem = [];
        $fifoPosition = null;

        foreach ($reservations as $reservation) {
            $fifoPosition ??= $reservation->fifo_sequence;

            foreach ($reservation->lines as $line) {
                if ($line->bom_line_ref !== null) {
                    $reservedByRef[$line->bom_line_ref] = bcadd(
                        $reservedByRef[$line->bom_line_ref] ?? '0.000',
                        $line->remainingQuantity(),
                        3
                    );
                }

                $reservedByItem[$line->item_id] = bcadd(
                    $reservedByItem[$line->item_id] ?? '0.000',
                    $line->remainingQuantity(),
                    3
                );
            }
        }

        $requisitionsByBomLine = [];
        $requisitionsByItem = [];
        $openRequisitionIds = [];

        foreach ($requisitionLines as $line) {
            $status = $line->requisition?->status?->value ?? $line->requisition?->status;
            $isOpen = in_array($status, ['draft', 'pending_approval', 'submitted', 'approved'], true);

            if (! $isOpen) {
                continue;
            }

            $openRequisitionIds[] = $line->purchase_requisition_id;

            if ($line->project_bom_line_id) {
                $requisitionsByBomLine[$line->project_bom_line_id][] = $line;
            }

            if ($line->warehouse_item_id) {
                $requisitionsByItem[$line->warehouse_item_id][] = $line;
            }
        }

        $lines = [];
        $warehouseLines = 0;
        $procurementOnlyLines = 0;
        $fullyReserved = 0;
        $shortageLines = 0;

        foreach ($bom?->lines ?? [] as $line) {
            $required = number_format((float) $line->quantity, 3, '.', '');
            $reserved = $reservedByRef[(string) $line->id]
                ?? ($line->warehouse_item_id ? ($reservedByItem[$line->warehouse_item_id] ?? '0.000') : '0.000');

            if ($line->is_procurement_only) {
                $reserved = '0.000';
                $procurementOnlyLines++;
            } else {
                $warehouseLines++;
            }

            $shortage = $line->is_procurement_only
                ? '0.000'
                : (bccomp($required, $reserved, 3) === 1 ? bcsub($required, $reserved, 3) : '0.000');

            if (! $line->is_procurement_only && bccomp($shortage, '0.000', 3) === 1) {
                $shortageLines++;
            }

            if (! $line->is_procurement_only && bccomp($shortage, '0.000', 3) !== 1) {
                $fullyReserved++;
            }

            $linkedRequisitions = collect(
                $requisitionsByBomLine[$line->id]
                ?? ($line->warehouse_item_id ? ($requisitionsByItem[$line->warehouse_item_id] ?? []) : [])
            );

            $requisitionSummaries = $linkedRequisitions
                ->map(fn (PurchaseRequisitionLine $requisitionLine) => [
                    'id' => $requisitionLine->purchase_requisition_id,
                    'reference' => $requisitionLine->requisition?->reference ?? 'PR',
                    'status' => $requisitionLine->requisition?->status?->value ?? $requisitionLine->requisition?->status,
                ])
                ->unique('id')
                ->values()
                ->all();

            $quantityToRequisition = $line->is_procurement_only
                ? $required
                : $shortage;

            $lines[] = [
                'bom_line_id' => $line->id,
                'line_type' => $line->line_type,
                'material_code' => $line->material_code,
                'material_name' => $line->material_name,
                'warehouse_item_id' => $line->warehouse_item_id,
                'required_qty' => $required,
                'reserved_qty' => $reserved,
                'shortage_qty' => $shortage,
                'measurement_mm' => $line->measurement_mm,
                'is_procurement_only' => $line->is_procurement_only,
                'is_glass' => $line->is_glass,
                'is_addon' => $line->is_addon,
                'quantity_to_requisition' => $quantityToRequisition,
                'requisition_ids' => $linkedRequisitions
                    ->map(fn (PurchaseRequisitionLine $requisitionLine) => $requisitionLine->purchase_requisition_id)
                    ->unique()
                    ->values()
                    ->all(),
                'requisitions' => $requisitionSummaries,
                'can_create_requisition' => bccomp($quantityToRequisition, '0.000', 3) === 1
                    && $requisitionSummaries === [],
            ];
        }

        return [
            'project_id' => $project->id,
            'stage' => $project->stage?->value ?? $project->stage,
            'bom_version' => $bom?->version,
            'summary' => [
                'total_lines' => count($lines),
                'warehouse_lines' => $warehouseLines,
                'procurement_only_lines' => $procurementOnlyLines,
                'fully_reserved' => $fullyReserved,
                'shortage_lines' => $shortageLines,
                'open_requisitions' => count(array_unique($openRequisitionIds)),
                'glass_orders_pending' => $glassOrders
                    ->filter(fn (GlassOrder $order) => ! in_array($order->status?->value ?? $order->status, ['delivered', 'cancelled'], true))
                    ->count(),
            ],
            'lines' => $lines,
            'glass_orders' => $glassOrders->map(fn (GlassOrder $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status?->value ?? $order->status,
                'expected_delivery' => $order->expected_delivery?->toDateString(),
                'delivered_at' => $order->delivered_at?->toIso8601String(),
            ])->values()->all(),
            'fifo_position' => $fifoPosition,
        ];
    }
}
