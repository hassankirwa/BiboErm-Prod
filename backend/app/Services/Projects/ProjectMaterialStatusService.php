<?php

namespace App\Services\Projects;

use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\StockMovementType;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\Warehouse\StockMovement;
use App\Models\Warehouse\StockReservation;
use App\Services\Procurement\GoodsReceipts\GrnProcurementOnlyResolver;
use App\Services\Warehouse\Reservations\BomStockCheckService;
use App\Services\Warehouse\Reservations\MaterialCheckSnapshotService;
use Illuminate\Validation\ValidationException;

class ProjectMaterialStatusService
{
    public function __construct(
        protected GrnProcurementOnlyResolver $procurementOnlyResolver,
        protected ProjectFifoOrderService $fifoOrder,
        protected BomStockCheckService $stockCheck,
        protected MaterialCheckSnapshotService $materialCheckSnapshot,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Project $project): array
    {
        $bom = $project->relationLoaded('latestBom') && $project->latestBom !== null
            ? ($project->latestBom->relationLoaded('lines')
                ? $project->latestBom
                : $project->latestBom->load(['lines.warehouseItem']))
            : ProjectBom::query()
                ->where('project_id', $project->id)
                ->with(['lines.warehouseItem'])
                ->orderByDesc('version')
                ->first();

        $reservations = StockReservation::query()
            ->where('project_id', $project->id)
            ->with(['lines.item'])
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
        $fifoPosition = $this->fifoOrder->positionFor((int) $project->id);

        foreach ($reservations as $reservation) {
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

        $stockCheckPayload = $this->runStockCheck($project, $bom);
        $this->syncMaterialCheckSnapshotIfStale($project, $stockCheckPayload);
        $checkByItem = [];
        foreach ($stockCheckPayload['lines'] ?? [] as $checkLine) {
            $checkByItem[(int) $checkLine['item_id']] = $checkLine;
        }
        $aluminiumPlans = $stockCheckPayload['aluminium_plans'] ?? [];
        $aluminiumShortageAttributed = [];

        // Combined SKUs (aluminium bars / rubber metres): pre-compute coverage per item.
        // Aluminium bar packs: a partial hold is OK for unit/completion when warehouse
        // can still cover the remaining gap (no procurement shortage) — e.g. 18/24 m.
        // Rubber exact metres still require the full cut total.
        $aluminiumSkuCovered = [];
        foreach ($aluminiumPlans as $itemId => $plan) {
            $itemId = (int) $itemId;
            $target = (string) ($plan['reserve_qty'] ?? '0.000');
            $reservedForSku = $reservedByItem[$itemId] ?? '0.000';
            $fullyHeld = bccomp($target, '0.000', 3) !== 1
                || bccomp($reservedForSku, $target, 3) >= 0;

            if (($plan['packing_mode'] ?? null) === 'exact_metres') {
                $aluminiumSkuCovered[$itemId] = $fullyHeld;
                continue;
            }

            $checkShortage = (string) ($checkByItem[$itemId]['shortage'] ?? '0.000');
            $hasHold = bccomp($reservedForSku, '0.000', 3) === 1;
            $aluminiumSkuCovered[$itemId] = $fullyHeld
                || ($hasHold && bccomp($checkShortage, '0.000', 3) !== 1);
        }

        $lines = [];
        $warehouseLines = 0;
        $procurementOnlyLines = 0;
        $fullyReserved = 0;
        $shortageLines = 0;
        $reservationUnitsTotal = 0;
        $reservationUnitsReserved = 0;
        $aluminiumUnitCounted = [];

        foreach ($bom?->lines ?? [] as $line) {
            $required = number_format((float) $line->quantity, 3, '.', '');
            $itemId = $line->warehouse_item_id ? (int) $line->warehouse_item_id : null;
            $item = $line->warehouseItem;
            $isCombinedAluminium = $itemId !== null && isset($aluminiumPlans[$itemId]);
            $isAluminium = $isCombinedAluminium
                || $item?->category === ItemCategory::AluminiumProfile
                || $line->line_type === 'aluminium_profile';
            $check = $itemId ? ($checkByItem[$itemId] ?? null) : null;
            $plan = $itemId ? ($aluminiumPlans[$itemId] ?? null) : null;

            if ($line->is_procurement_only) {
                $reserved = '0.000';
                $procurementOnlyLines++;
            } else {
                $warehouseLines++;
            }

            $reservationTarget = $required;
            $reserved = '0.000';

            if ($line->is_procurement_only) {
                $isFullyReserved = false;
            } elseif ($isCombinedAluminium && $itemId !== null) {
                $reservationTarget = (string) ($plan['reserve_qty'] ?? '0.000');
                $reserved = $reservedByItem[$itemId] ?? '0.000';
                $isFullyReserved = (bool) ($aluminiumSkuCovered[$itemId] ?? false);
            } else {
                $reserved = $reservedByRef[(string) $line->id]
                    ?? ($itemId ? ($reservedByItem[$itemId] ?? '0.000') : '0.000');
                $isFullyReserved = bccomp($reserved, $reservationTarget, 3) >= 0;
            }

            $warehouseAvailable = $check['effective_available'] ?? $check['available'] ?? '0.000';
            $offcutUsable = $check['offcut_usable'] ?? '0.000';
            $barsNeeded = null;
            if ($isCombinedAluminium) {
                $rawBars = $check['bars_needed'] ?? $plan['bars_needed'] ?? null;
                $barsNeeded = $rawBars === null ? null : (int) $rawBars;
                if (($plan['packing_mode'] ?? null) === 'exact_metres') {
                    $barsNeeded = null;
                }
            }
            $stockCheckShortage = (string) ($check['shortage'] ?? '0.000');

            // Procurement shortage: still needed after reserve, or (if unreserved) after live WH+offcut.
            if ($line->is_procurement_only) {
                $shortage = '0.000';
            } elseif ($isFullyReserved) {
                $shortage = '0.000';
            } elseif ($isCombinedAluminium && $itemId !== null) {
                if (bccomp($stockCheckShortage, '0.000', 3) !== 1) {
                    $shortage = '0.000';
                } elseif (! isset($aluminiumShortageAttributed[$itemId])) {
                    $aluminiumShortageAttributed[$itemId] = true;
                    $shortage = $stockCheckShortage;
                } else {
                    $shortage = '0.000';
                }
            } else {
                $remainingAfterReserve = bccomp($required, $reserved, 3) === 1
                    ? bcsub($required, $reserved, 3)
                    : '0.000';
                $coverable = bccomp($warehouseAvailable, $remainingAfterReserve, 3) >= 0
                    ? $remainingAfterReserve
                    : $warehouseAvailable;
                $shortage = bcsub($remainingAfterReserve, $coverable, 3);
            }

            if (! $line->is_procurement_only && bccomp($shortage, '0.000', 3) === 1) {
                $shortageLines++;
            }

            if ($isFullyReserved) {
                $fullyReserved++;
            }

            // Reservation units: one per combined aluminium SKU, one per other warehouse BOM line.
            if (! $line->is_procurement_only) {
                if ($isCombinedAluminium && $itemId !== null) {
                    if (! isset($aluminiumUnitCounted[$itemId])) {
                        $aluminiumUnitCounted[$itemId] = true;
                        $reservationUnitsTotal++;
                        if ($isFullyReserved) {
                            $reservationUnitsReserved++;
                        }
                    }
                } else {
                    $reservationUnitsTotal++;
                    if ($isFullyReserved) {
                        $reservationUnitsReserved++;
                    }
                }
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
                'reservation_target_qty' => $reservationTarget,
                'reservation_uom' => $isCombinedAluminium
                    ? (string) ($plan['reserve_uom'] ?? 'metre')
                    : ($item?->unit_of_measure ?? 'pcs'),
                'sku_cuts_total' => $isCombinedAluminium ? (int) ($plan['cuts_total'] ?? 0) : null,
                'shortage_qty' => $shortage,
                'warehouse_available' => $line->is_procurement_only ? null : $warehouseAvailable,
                'offcut_usable' => $isCombinedAluminium ? $offcutUsable : null,
                'bars_needed' => $barsNeeded,
                'stock_check_shortage' => $line->is_procurement_only ? null : $stockCheckShortage,
                'is_fully_reserved' => $isFullyReserved,
                'is_combined_aluminium' => $isCombinedAluminium,
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

        $canFullyReserve = (bool) ($stockCheckPayload['can_fully_reserve'] ?? false);
        $reservationComplete = $reservationUnitsTotal > 0
            && $reservationUnitsReserved >= $reservationUnitsTotal;
        $canReserveNow = $canFullyReserve
            && $warehouseLines > 0
            && ! $reservationComplete;

        $uniqueMaterialKeys = collect($bom?->lines ?? [])
            ->map(function (ProjectBomLine $line) {
                if ($line->warehouse_item_id) {
                    return 'item:'.$line->warehouse_item_id;
                }
                if ($line->is_procurement_only) {
                    return 'proc:'.mb_strtolower(trim((string) $line->material_name));
                }

                return 'line:'.$line->id;
            })
            ->unique()
            ->count();

        $materialsReleased = $this->buildMaterialsReleasedSummary($reservations);

        return [
            'project_id' => $project->id,
            'stage' => $project->stage?->value ?? $project->stage,
            'bom_version' => $bom?->version,
            'summary' => [
                'total_lines' => count($lines),
                'unique_materials' => $uniqueMaterialKeys,
                'warehouse_lines' => $warehouseLines,
                'procurement_only_lines' => $procurementOnlyLines,
                'fully_reserved' => $fullyReserved,
                'reservation_units_total' => $reservationUnitsTotal,
                'reservation_units_reserved' => $reservationUnitsReserved,
                'reservation_complete' => $reservationComplete,
                'shortage_lines' => $shortageLines,
                'open_requisitions' => count(array_unique($openRequisitionIds)),
                'glass_orders_pending' => $glassOrders
                    ->filter(fn (GlassOrder $order) => ! in_array($order->status?->value ?? $order->status, ['delivered', 'cancelled'], true))
                    ->count(),
                'materials_released_lines' => count($materialsReleased),
                'can_fully_reserve' => $canFullyReserve,
                'can_reserve_now' => $canReserveNow,
            ],
            'stock_check' => [
                'checked_at' => now()->toIso8601String(),
                'can_fully_reserve' => (bool) ($stockCheckPayload['can_fully_reserve'] ?? false),
                'line_count' => count($stockCheckPayload['lines'] ?? []),
                'shortage_lines' => collect($stockCheckPayload['lines'] ?? [])
                    ->filter(fn (array $line) => bccomp((string) ($line['shortage'] ?? '0'), '0', 3) === 1)
                    ->count(),
                'lines' => $stockCheckPayload['lines'] ?? [],
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
            'goods_receipts' => $this->buildGoodsReceiptsSummary($project),
            'materials_released' => $materialsReleased,
        ];
    }

    /**
     * @return array{project_id: int, lines: list<array<string, mixed>>, can_fully_reserve: bool, aluminium_plans?: array<int, array<string, mixed>>}
     */
    protected function runStockCheck(Project $project, ?ProjectBom $bom): array
    {
        $bomLines = ($bom?->lines ?? collect())
            ->filter(fn (ProjectBomLine $line) => ! $line->is_procurement_only && (bool) $line->warehouse_item_id)
            ->map(fn (ProjectBomLine $line) => [
                'item_id' => (int) $line->warehouse_item_id,
                'quantity' => (string) $line->quantity,
                'project_bom_line_id' => $line->id,
                'required_length_mm' => $line->measurement_mm,
                'bom_line_ref' => (string) $line->id,
            ])
            ->values()
            ->all();

        if ($bomLines === []) {
            return [
                'project_id' => $project->id,
                'lines' => [],
                'can_fully_reserve' => true,
                'aluminium_plans' => [],
            ];
        }

        return $this->stockCheck->check($project->id, $bomLines);
    }

    /**
     * Refresh stage_data.material_check when a stale shortage snapshot disagrees with live stock.
     *
     * @param  array{can_fully_reserve?: bool, lines?: list<array<string, mixed>>}  $check
     */
    protected function syncMaterialCheckSnapshotIfStale(Project $project, array $check): void
    {
        $existing = is_array($project->stage_data) ? ($project->stage_data['material_check'] ?? null) : null;
        $liveCanReserve = (bool) ($check['can_fully_reserve'] ?? false);
        $liveShortageCount = collect($check['lines'] ?? [])
            ->filter(fn (array $line) => bccomp((string) ($line['shortage'] ?? '0'), '0', 3) === 1)
            ->count();

        if (! is_array($existing)) {
            return;
        }

        $snapshotCanReserve = (bool) ($existing['can_fully_reserve'] ?? false);
        $snapshotShortageCount = (int) ($existing['shortage_lines'] ?? 0);

        if ($snapshotCanReserve === $liveCanReserve && $snapshotShortageCount === $liveShortageCount) {
            return;
        }

        $this->materialCheckSnapshot->store($project, $check);
        $project->refresh();
    }

    /**
     * Aggregated stock already handed from warehouse reservation to production.
     *
     * @param  \Illuminate\Support\Collection<int, StockReservation>  $reservations
     * @return list<array<string, mixed>>
     */
    protected function buildMaterialsReleasedSummary($reservations): array
    {
        $byItem = [];

        foreach ($reservations as $reservation) {
            foreach ($reservation->lines as $line) {
                $released = number_format((float) $line->quantity_released, 3, '.', '');
                if (bccomp($released, '0.000', 3) !== 1) {
                    continue;
                }

                $itemId = (int) $line->item_id;
                if (! isset($byItem[$itemId])) {
                    $byItem[$itemId] = [
                        'item_id' => $itemId,
                        'sku' => $line->item?->sku,
                        'name' => $line->item?->name,
                        'unit_of_measure' => $line->item?->unit_of_measure,
                        'quantity_released' => '0.000',
                        'quantity_reserved' => '0.000',
                        'reservation_ids' => [],
                    ];
                }

                $byItem[$itemId]['quantity_released'] = bcadd(
                    $byItem[$itemId]['quantity_released'],
                    $released,
                    3,
                );
                $byItem[$itemId]['quantity_reserved'] = bcadd(
                    $byItem[$itemId]['quantity_reserved'],
                    number_format((float) $line->quantity_reserved, 3, '.', ''),
                    3,
                );
                $byItem[$itemId]['reservation_ids'][] = $reservation->id;
            }
        }

        return collect($byItem)
            ->map(function (array $row) {
                $row['reservation_ids'] = array_values(array_unique($row['reservation_ids']));

                return $row;
            })
            ->sortBy('sku')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function buildGoodsReceiptsSummary(Project $project): array
    {
        $receipts = GoodsReceipt::query()
            ->where('project_id', $project->id)
            ->whereHas(
                'purchaseOrder',
                fn ($query) => $query->where('project_id', $project->id),
            )
            ->with([
                'purchaseOrder.supplier',
                'purchaseOrder.lines',
                'lines.purchaseOrderLine',
                'lines.warehouseItem',
            ])
            ->orderByDesc('received_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->unique('purchase_order_id')
            ->values();

        if ($receipts->isEmpty()) {
            return [];
        }

        $putawayNotesByGrn = StockMovement::query()
            ->where('movement_type', StockMovementType::Inbound)
            ->where('reference_type', 'goods_receipt')
            ->whereIn('reference_id', $receipts->pluck('id'))
            ->orderByDesc('performed_at')
            ->get()
            ->groupBy('reference_id')
            ->map(fn ($movements) => $movements->first()?->notes)
            ->all();

        return $receipts
            ->map(function (GoodsReceipt $grn) use ($putawayNotesByGrn) {
                $this->procurementOnlyResolver->annotateGoodsReceipt($grn);

                $poLines = $grn->purchaseOrder?->lines?->keyBy('id') ?? collect();

                return [
                    'id' => $grn->id,
                    'grn_number' => $grn->grn_number,
                    'status' => $grn->status?->value ?? $grn->status,
                    'received_at' => $grn->received_at?->toIso8601String(),
                    'verified_at' => $grn->verified_at?->toIso8601String(),
                    'notes' => $grn->notes,
                    'quality_inspection_notes' => $grn->quality_inspection_notes,
                    'putaway_notes' => $putawayNotesByGrn[$grn->id] ?? null,
                    'purchase_order' => $grn->purchaseOrder ? [
                        'id' => $grn->purchaseOrder->id,
                        'reference' => $grn->purchaseOrder->reference,
                        'supplier_name' => $grn->purchaseOrder->supplier?->name,
                    ] : null,
                    'lines' => $grn->lines->map(function ($line) use ($poLines) {
                        $poLine = $poLines->get($line->purchase_order_line_id);
                        $warehouseItem = $line->warehouseItem;

                        return [
                            'id' => $line->id,
                            'description' => $poLine?->description ?? 'Line item',
                            'warehouse_item_id' => $line->warehouse_item_id,
                            'warehouse_item_sku' => $warehouseItem?->sku,
                            'warehouse_item_name' => $warehouseItem?->name,
                            'warehouse_item_category' => $warehouseItem?->category?->value ?? $warehouseItem?->category,
                            'is_procurement_only' => (bool) ($line->is_procurement_only ?? false),
                            'qty_received' => (string) $line->qty_received,
                            'qty_accepted' => (string) $line->qty_accepted,
                            'qty_rejected' => (string) $line->qty_rejected,
                            'to_bin_id' => $line->to_bin_id,
                            'notes' => $line->notes,
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Hard gate for advancing to materials_ready.
     * Requires this-project reservations to cover every warehouse BOM line.
     * Stock reserved for other projects does not count; open procurement/glass blocks Ready.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function assertCanAdvanceToMaterialsReady(Project $project): void
    {
        $status = $this->build($project);
        $summary = $status['summary'] ?? [];
        $bomVersion = $status['bom_version'] ?? null;

        if ($bomVersion === null) {
            throw ValidationException::withMessages([
                'materials' => [
                    'Cannot mark materials ready: upload and finalize a BOM first.',
                ],
            ]);
        }

        $unitsTotal = (int) ($summary['reservation_units_total'] ?? $summary['warehouse_lines'] ?? 0);
        $unitsReserved = (int) ($summary['reservation_units_reserved'] ?? $summary['fully_reserved'] ?? 0);
        $openRequisitions = (int) ($summary['open_requisitions'] ?? 0);
        $glassPending = (int) ($summary['glass_orders_pending'] ?? 0);
        $notReserved = max(0, $unitsTotal - $unitsReserved);

        if ($unitsTotal > 0 && $notReserved > 0) {
            throw ValidationException::withMessages([
                'materials' => [
                    "Cannot mark materials ready: {$notReserved} material unit(s) still short or not reserved to this project (aluminium profiles count once per SKU). Stock reserved for other projects does not count.",
                ],
            ]);
        }

        // Open PRs only block when materials are still short. Once fully reserved, leftover PRs are obsolete.
        if ($openRequisitions > 0 && $notReserved > 0) {
            throw ValidationException::withMessages([
                'materials' => [
                    'Cannot mark materials ready: open procurement requisitions remain.',
                ],
            ]);
        }

        if ($glassPending > 0) {
            throw ValidationException::withMessages([
                'materials' => [
                    'Cannot mark materials ready: glass orders are still pending.',
                ],
            ]);
        }
    }
}
