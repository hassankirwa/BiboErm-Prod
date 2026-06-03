<?php

namespace App\Services\Procurement\PurchaseOrders;

use App\Enums\Procurement\RequisitionStatus;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\SupplierItemPrice;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PurchaseOrderDraftService
{
    /**
     * @param  array<int>  $requisitionIds
     * @return array{groups: list<array<string, mixed>>}
     */
    public function buildFromRequisitions(array $requisitionIds): array
    {
        $requisitionIds = array_values(array_unique(array_map('intval', $requisitionIds)));

        if ($requisitionIds === []) {
            throw ValidationException::withMessages(['requisition_ids' => ['Select at least one requisition.']]);
        }

        $requisitions = PurchaseRequisition::query()
            ->with(['lines.warehouseItem', 'project', 'supplier', 'purchaseOrders'])
            ->whereIn('id', $requisitionIds)
            ->get();

        if ($requisitions->count() !== count($requisitionIds)) {
            throw ValidationException::withMessages(['requisition_ids' => ['One or more requisitions were not found.']]);
        }

        foreach ($requisitions as $requisition) {
            $status = $requisition->status instanceof RequisitionStatus
                ? $requisition->status
                : RequisitionStatus::tryFrom((string) $requisition->status);

            if ($status !== RequisitionStatus::Approved) {
                throw ValidationException::withMessages([
                    'requisition_ids' => ["Requisition {$requisition->reference} must be approved before creating a PO."],
                ]);
            }

            if ($requisition->purchaseOrders->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'requisition_ids' => ["Requisition {$requisition->reference} already has a purchase order."],
                ]);
            }

            if (! $requisition->supplier_id) {
                throw ValidationException::withMessages([
                    'requisition_ids' => ["Requisition {$requisition->reference} has no supplier assigned."],
                ]);
            }
        }

        $groups = $requisitions
            ->groupBy('supplier_id')
            ->sortKeys()
            ->map(fn (Collection $group) => $this->buildSupplierGroup($group))
            ->values()
            ->all();

        return ['groups' => $groups];
    }

    /**
     * @param  Collection<int, PurchaseRequisition>  $requisitions
     * @return array<string, mixed>
     */
    protected function buildSupplierGroup(Collection $requisitions): array
    {
        /** @var PurchaseRequisition $primary */
        $primary = $requisitions->first();
        $supplier = $primary->supplier;
        $priceMap = $this->currentPricesForSupplier((int) $supplier?->id, $requisitions);

        $lines = [];
        foreach ($requisitions as $requisition) {
            foreach ($requisition->lines as $line) {
                $itemId = $line->warehouse_item_id;
                $estimated = $line->estimated_unit_price !== null
                    ? (float) $line->estimated_unit_price
                    : null;
                $catalogPrice = $itemId ? ($priceMap[$itemId] ?? null) : null;
                $unitPrice = $catalogPrice ?? $estimated ?? 0;

                $lines[] = [
                    'requisition_id' => $requisition->id,
                    'requisition_line_id' => $line->id,
                    'requisition_reference' => $requisition->reference,
                    'description' => $line->description,
                    'sku' => $line->sku ?? $line->warehouseItem?->sku,
                    'quantity' => (string) $line->quantity,
                    'unit_of_measure' => $line->unit_of_measure ?? $line->warehouseItem?->unit_of_measure,
                    'warehouse_item_id' => $itemId,
                    'unit_price' => number_format($unitPrice, 2, '.', ''),
                ];
            }
        }

        $project = $requisitions->pluck('project_id')->filter()->unique();
        $projectId = $project->count() === 1 ? $project->first() : null;

        return [
            'supplier_id' => $primary->supplier_id,
            'supplier' => $supplier ? [
                'id' => $supplier->id,
                'code' => $supplier->code,
                'name' => $supplier->name,
                'category' => $supplier->category,
                'email' => $supplier->email,
                'phone' => $supplier->phone,
                'address' => $supplier->address,
            ] : null,
            'requisition_ids' => $requisitions->pluck('id')->values()->all(),
            'requisition_references' => $requisitions->pluck('reference')->values()->all(),
            'project_id' => $projectId,
            'project' => $projectId && $primary->project ? [
                'id' => $primary->project->id,
                'reference' => $primary->project->reference,
                'name' => $primary->project->name,
            ] : null,
            'notes' => $requisitions->pluck('notes')->filter()->implode("\n\n"),
            'lines' => $lines,
        ];
    }

    /**
     * @param  Collection<int, PurchaseRequisition>  $requisitions
     * @return array<int, float>
     */
    protected function currentPricesForSupplier(int $supplierId, Collection $requisitions): array
    {
        $itemIds = $requisitions
            ->flatMap(fn (PurchaseRequisition $req) => $req->lines->pluck('warehouse_item_id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($itemIds === []) {
            return [];
        }

        return SupplierItemPrice::query()
            ->where('supplier_id', $supplierId)
            ->whereIn('warehouse_item_id', $itemIds)
            ->where('is_current', true)
            ->pluck('unit_price', 'warehouse_item_id')
            ->map(fn ($price) => (float) $price)
            ->all();
    }
}
