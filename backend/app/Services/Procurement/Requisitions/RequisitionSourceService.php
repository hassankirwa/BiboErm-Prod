<?php

namespace App\Services\Procurement\Requisitions;

use App\Enums\Procurement\RequisitionTrigger;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Project;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Item;
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
    public function lowStockSource(): array
    {
        $availableByItem = DB::table('stock_levels')
            ->selectRaw('item_id, COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) as available_qty')
            ->groupBy('item_id')
            ->pluck('available_qty', 'item_id');

        $openRequisitionsByItem = $this->openRequisitionLines()
            ->where('trigger_type', RequisitionTrigger::LowStock->value)
            ->whereNotNull('warehouse_item_id')
            ->get()
            ->groupBy('warehouse_item_id');

        return Item::query()
            ->where('is_active', true)
            ->where('min_stock_qty', '>', 0)
            ->orderBy('name')
            ->get()
            ->map(function (Item $item) use ($availableByItem, $openRequisitionsByItem) {
                $availableQty = (string) ($availableByItem[$item->id] ?? '0.000');
                $minimumQty = (string) $item->min_stock_qty;

                if (bccomp($availableQty, $minimumQty, 3) >= 0) {
                    return null;
                }

                $openLines = $openRequisitionsByItem->get($item->id, collect());
                $shortageQty = bcsub($minimumQty, $availableQty, 3);

                return [
                    'warehouse_item_id' => $item->id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'unit_of_measure' => $item->unit_of_measure,
                    'available_qty' => $availableQty,
                    'min_stock_qty' => $minimumQty,
                    'quantity_to_requisition' => $shortageQty,
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

            return [
                'warehouse_item_id' => $bomLine->warehouse_item_id,
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

        return $this->createAndSubmit(
            $user,
            [
                'project_id' => $project->id,
                'supplier_id' => $supplierId,
                'notes' => $notes ?: 'Generated from project materials',
                'lines' => $preparedLines,
            ],
            RequisitionTrigger::ProjectMaterial,
        );
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     * @param  list<array<string, mixed>>  $overrides
     * @return list<array<string, mixed>>
     */
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
