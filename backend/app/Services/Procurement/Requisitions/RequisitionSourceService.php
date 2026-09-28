<?php

namespace App\Services\Procurement\Requisitions;

use App\Enums\Procurement\RequisitionTrigger;
use App\Enums\Warehouse\ItemCategory;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Project;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Services\Procurement\ProcurementWarehouseItemResolver;
use App\Services\Projects\ProjectMaterialStatusService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequisitionSourceService
{
    public function __construct(
        protected PurchaseRequisitionService $requisitions,
        protected ProjectMaterialStatusService $projectMaterialStatus,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function lowStockSource(?string $category = null): array
    {
        if ($category !== null) {
            ItemCategory::from($category);
        }

        $availableByItem = DB::table('stock_levels')
            ->selectRaw('item_id, COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) as available_qty')
            ->groupBy('item_id')
            ->pluck('available_qty', 'item_id');

        $openRequisitionsByItem = $this->openRequisitionLines()
            ->where('trigger_type', RequisitionTrigger::LowStock->value)
            ->whereNotNull('warehouse_item_id')
            ->get()
            ->groupBy('warehouse_item_id');

        $query = Item::query()->where('is_active', true);

        if ($category !== null) {
            $query->where('category', $category);
        }

        return $query
            ->orderBy('name')
            ->get()
            ->map(function (Item $item) use ($availableByItem, $openRequisitionsByItem) {
                $availableQty = number_format((float) ($availableByItem[$item->id] ?? 0), 3, '.', '');
                $minimumQty = number_format((float) ($item->min_stock_qty ?? 0), 3, '.', '');
                $hasMinimum = bccomp($minimumQty, '0', 3) === 1;
                $isOutOfStock = bccomp($availableQty, '0', 3) <= 0;
                $isBelowMinimum = $hasMinimum && bccomp($availableQty, $minimumQty, 3) < 0;

                // Catalog imports default min_stock_qty to 0, so out-of-stock catalog
                // rows must still be eligible for low-stock requisitions.
                if (! $isBelowMinimum && ! $isOutOfStock) {
                    return null;
                }

                $openLines = $openRequisitionsByItem->get($item->id, collect());
                $shortageQty = $hasMinimum
                    ? bcsub($minimumQty, $availableQty, 3)
                    : '1.000';

                if (bccomp($shortageQty, '0', 3) <= 0) {
                    $shortageQty = '1.000';
                }

                return [
                    'warehouse_item_id' => $item->id,
                    'category' => $item->category?->value ?? $item->category,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'unit_of_measure' => $item->unit_of_measure,
                    'available_qty' => $availableQty,
                    'min_stock_qty' => $minimumQty,
                    'quantity_to_requisition' => $shortageQty,
                    'stock_status' => $isOutOfStock ? 'out_of_stock' : 'low_stock',
                    'requisitions' => $this->summarizeRequisitions($openLines),
                    'can_create_requisition' => $openLines->isEmpty(),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    public function createFromLowStock(
        User $user,
        array $warehouseItemIds,
        ?string $notes = null,
        ?int $supplierId = null,
        array $lineOverrides = [],
    ): PurchaseRequisition {
        $selectedIds = collect($warehouseItemIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        $available = collect($this->lowStockSource())->keyBy('warehouse_item_id');
        $selected = $selectedIds->map(fn (int $id) => $available->get($id))->filter()->values();

        if ($selected->isEmpty()) {
            throw ValidationException::withMessages([
                'warehouse_item_ids' => ['Select at least one low-stock item that is not already requisitioned.'],
            ]);
        }

        $lines = $selected->map(fn (array $item) => [
            'warehouse_item_id' => $item['warehouse_item_id'],
            'description' => $item['name'],
            'sku' => $item['sku'],
            'quantity' => $item['quantity_to_requisition'],
            'unit_of_measure' => $item['unit_of_measure'],
            'trigger_type' => RequisitionTrigger::LowStock->value,
        ])->all();

        $lines = $this->applyQuantityOverrides($lines, $lineOverrides, 'warehouse_item_id');

        return $this->createAndSubmit(
            $user,
            [
                'supplier_id' => $supplierId,
                'notes' => $notes ?: 'Generated from low stock',
                'lines' => $lines,
            ],
            RequisitionTrigger::LowStock,
        );
    }

    public function createFromProjectMaterials(
        User $user,
        Project $project,
        array $projectBomLineIds,
        ?string $notes = null,
        ?int $supplierId = null,
        array $lineOverrides = [],
    ): PurchaseRequisition {
        $selectedIds = collect($projectBomLineIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($selectedIds->isEmpty()) {
            throw ValidationException::withMessages([
                'project_bom_line_ids' => ['Select at least one project material line.'],
            ]);
        }

        $statusLines = collect($this->projectMaterialStatus->build($project)['lines'] ?? [])
            ->keyBy('bom_line_id');

        $bomLines = ProjectBomLine::query()
            ->with('warehouseItem')
            ->whereIn('id', $selectedIds->all())
            ->whereHas('bom', fn ($query) => $query->where('project_id', $project->id))
            ->get()
            ->keyBy('id');

        $lines = $selectedIds->map(function (int $lineId) use ($statusLines, $bomLines) {
            $statusLine = $statusLines->get($lineId);
            $bomLine = $bomLines->get($lineId);

            if (! $statusLine || ! $bomLine) {
                return null;
            }

            if (! empty($statusLine['requisition_ids'] ?? [])) {
                return null;
            }

            $quantity = (string) ($statusLine['quantity_to_requisition'] ?? '0.000');
            if (bccomp($quantity, '0.000', 3) !== 1) {
                return null;
            }

            $warehouseItemId = $bomLine->warehouse_item_id
                ?? app(ProcurementWarehouseItemResolver::class)->resolveFromBomLine($bomLine);

            return [
                'warehouse_item_id' => $warehouseItemId,
                'project_bom_line_id' => $bomLine->id,
                'description' => $bomLine->material_name,
                'sku' => $bomLine->warehouseItem?->sku ?? $bomLine->material_code,
                'quantity' => $quantity,
                'unit_of_measure' => $bomLine->warehouseItem?->unit_of_measure,
                'trigger_type' => RequisitionTrigger::ProjectMaterial->value,
                'notes' => $bomLine->notes,
            ];
        })->filter()->values();

        if ($lines->isEmpty()) {
            throw ValidationException::withMessages([
                'project_bom_line_ids' => ['The selected materials already have an open requisition or no procurement quantity remaining.'],
            ]);
        }

        $preparedLines = $this->applyQuantityOverrides($lines->all(), $lineOverrides, 'project_bom_line_id');

        foreach ($preparedLines as $line) {
            if (! empty($line['warehouse_item_id'])) {
                continue;
            }

            $bomLine = ProjectBomLine::query()->find($line['project_bom_line_id'] ?? null);

            if ($bomLine?->is_procurement_only) {
                continue;
            }

            throw ValidationException::withMessages([
                'lines' => [
                    "“{$line['description']}” is not linked to a warehouse catalog item. "
                    .'Open the project BOM and match the line to stock, mark it procurement-only (glass/add-ons), or pass warehouse_item_id when creating the requisition.',
                ],
            ]);
        }

        $requisition = $this->createAndSubmit(
            $user,
            [
                'project_id' => $project->id,
                'supplier_id' => $supplierId,
                'notes' => $notes ?: 'Generated from project materials',
                'lines' => $preparedLines,
            ],
            RequisitionTrigger::ProjectMaterial,
        );

        $resolver = app(ProcurementWarehouseItemResolver::class);
        $requisition->load('lines');
        foreach ($requisition->lines as $reqLine) {
            if ($reqLine->warehouse_item_id && $reqLine->project_bom_line_id) {
                $bom = ProjectBomLine::query()->find($reqLine->project_bom_line_id);
                if ($bom && ! $bom->warehouse_item_id) {
                    $bom->update(['warehouse_item_id' => $reqLine->warehouse_item_id]);
                }
            }
        }

        return $requisition;
    }

    public function createFromGlassOrder(User $user, GlassOrder $order): PurchaseRequisition
    {
        if ($order->purchase_requisition_id) {
            $existing = PurchaseRequisition::query()->find($order->purchase_requisition_id);
            if ($existing) {
                return $existing;
            }
        }

        $lines = $this->buildGlassOrderRequisitionLines($order);

        if ($lines === []) {
            throw ValidationException::withMessages([
                'specs.panes' => ['Add at least one pane with width, height, and quantity before ordering.'],
            ]);
        }

        $specs = is_array($order->specs) ? $order->specs : [];
        $requirements = trim((string) ($specs['requirements'] ?? ''));

        $requisition = $this->createAndSubmit(
            $user,
            [
                'project_id' => $order->project_id,
                'supplier_id' => $order->supplier_id,
                'notes' => trim("Glass order {$order->order_number}".($requirements !== '' ? " — {$requirements}" : '')),
                'lines' => $lines,
            ],
            RequisitionTrigger::GlassOrder,
        );

        $order->update(['purchase_requisition_id' => $requisition->id]);

        return $requisition;
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function buildGlassOrderRequisitionLines(GlassOrder $order): array
    {
        $specs = is_array($order->specs) ? $order->specs : [];
        $requirements = trim((string) ($specs['requirements'] ?? ''));
        $panes = $specs['panes'] ?? [];

        if (! is_array($panes)) {
            return [];
        }

        $lines = [];

        foreach ($panes as $pane) {
            if (! is_array($pane)) {
                continue;
            }

            $width = $pane['width_mm'] ?? null;
            $height = $pane['height_mm'] ?? null;
            $quantity = $pane['quantity'] ?? null;

            if (! is_numeric($width) || ! is_numeric($height) || ! is_numeric($quantity)) {
                continue;
            }

            if ((float) $width <= 0 || (float) $height <= 0 || (float) $quantity <= 0) {
                continue;
            }

            $name = trim((string) ($pane['name'] ?? 'Glass pane'));
            $glassType = trim((string) ($pane['glass_type'] ?? ''));
            $description = $name;

            if ($glassType !== '') {
                $description .= " ({$glassType})";
            }

            $description .= " — {$width}×{$height} mm";

            $paneNotes = trim((string) ($pane['notes'] ?? ''));
            $notes = collect([$requirements, $paneNotes])->filter()->implode(' · ');

            $lines[] = [
                'project_bom_line_id' => $pane['bom_line_id'] ?? null,
                'description' => $description,
                'sku' => $glassType !== '' ? $glassType : null,
                'quantity' => (string) $quantity,
                'unit_of_measure' => 'pane',
                'trigger_type' => RequisitionTrigger::GlassOrder->value,
                'notes' => $notes !== '' ? $notes : null,
            ];
        }

        return $lines;
    }

    protected function applyQuantityOverrides(array $lines, array $overrides, string $keyField): array
    {
        if ($overrides === []) {
            return array_map(function (array $line) {
                $line['required_quantity'] = $line['quantity'];

                return $line;
            }, $lines);
        }

        $overrideMap = collect($overrides)->keyBy($keyField);

        return collect($lines)->map(function (array $line) use ($overrideMap, $keyField) {
            $requiredQty = (string) $line['quantity'];
            $line['required_quantity'] = $requiredQty;

            $lineKey = $line[$keyField] ?? null;
            if ($lineKey === null) {
                return $line;
            }

            $override = $overrideMap->get($lineKey);

            if ($override && ! empty($override['warehouse_item_id'])) {
                $line['warehouse_item_id'] = (int) $override['warehouse_item_id'];
            }

            if (! $override || ! isset($override['quantity'])) {
                return $line;
            }

            $orderQty = (string) $override['quantity'];
            if (bccomp($orderQty, $requiredQty, 3) < 0) {
                throw ValidationException::withMessages([
                    'lines' => ["Order quantity for {$line['description']} cannot be less than the calculated need ({$requiredQty})."],
                ]);
            }

            $line['quantity'] = $orderQty;

            return $line;
        })->all();
    }

    protected function createAndSubmit(User $user, array $payload, RequisitionTrigger $trigger): PurchaseRequisition
    {
        $requisition = $this->requisitions->createDraft(
            user: $user,
            data: $payload,
            defaultTrigger: $trigger,
        );

        return $this->requisitions->submit($requisition);
    }

    protected function openRequisitionLines()
    {
        return PurchaseRequisitionLine::query()
            ->whereHas('requisition', fn ($query) => $query->whereIn('status', $this->openStatuses()))
            ->with('requisition');
    }

    /**
     * @param  Collection<int, PurchaseRequisitionLine>  $lines
     * @return list<array{id: int, reference: string, status: string}>
     */
    protected function summarizeRequisitions(Collection $lines): array
    {
        return $lines
            ->map(fn (PurchaseRequisitionLine $line) => [
                'id' => $line->purchase_requisition_id,
                'reference' => $line->requisition?->reference ?? 'PR',
                'status' => $line->requisition?->status?->value ?? (string) $line->requisition?->status,
            ])
            ->unique('id')
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    protected function openStatuses(): array
    {
        return ['draft', 'pending_approval', 'submitted', 'approved'];
    }
}
