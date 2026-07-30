<?php

namespace App\Services\Procurement\PurchaseOrders;

use App\Enums\Procurement\RequisitionStatus;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Procurement\Supplier;
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
            ->with([
                'lines.warehouseItem',
                'lines.preferredSupplier',
                'project',
                'supplier',
                'purchaseOrders.lines',
            ])
            ->whereIn('id', $requisitionIds)
            ->get();

        if ($requisitions->count() !== count($requisitionIds)) {
            throw ValidationException::withMessages(['requisition_ids' => ['One or more requisitions were not found.']]);
        }

        $lineBuckets = collect();

        foreach ($requisitions as $requisition) {
            $status = $requisition->status instanceof RequisitionStatus
                ? $requisition->status
                : RequisitionStatus::tryFrom((string) $requisition->status);

            if ($status !== RequisitionStatus::Approved) {
                throw ValidationException::withMessages([
                    'requisition_ids' => ["Requisition {$requisition->reference} must be approved before creating a PO."],
                ]);
            }

            $uncovered = $requisition->uncoveredLines();
            if ($uncovered->isEmpty()) {
                throw ValidationException::withMessages([
                    'requisition_ids' => ["Requisition {$requisition->reference} already has purchase orders covering all lines."],
                ]);
            }

            foreach ($uncovered as $line) {
                $supplierId = $line->effectiveSupplierId(
                    $requisition->supplier_id ? (int) $requisition->supplier_id : null
                );

                if (! $supplierId) {
                    throw ValidationException::withMessages([
                        'requisition_ids' => [
                            "Requisition {$requisition->reference} line \"{$line->description}\" has no supplier. Set a preferred supplier on the line or a default supplier on the requisition.",
                        ],
                    ]);
                }

                $lineBuckets->push([
                    'supplier_id' => $supplierId,
                    'requisition' => $requisition,
                    'line' => $line,
                ]);
            }
        }

        $supplierIds = $lineBuckets->pluck('supplier_id')->unique()->values()->all();
        $suppliers = Supplier::query()->whereIn('id', $supplierIds)->get()->keyBy('id');

        $groups = $lineBuckets
            ->groupBy('supplier_id')
            ->sortKeys()
            ->map(function (Collection $bucket, $supplierId) use ($suppliers) {
                return $this->buildSupplierGroup(
                    (int) $supplierId,
                    $suppliers->get((int) $supplierId),
                    $bucket,
                );
            })
            ->values()
            ->all();

        return ['groups' => $groups];
    }

    /**
     * @param  Collection<int, array{supplier_id: int, requisition: PurchaseRequisition, line: PurchaseRequisitionLine}>  $bucket
     * @return array<string, mixed>
     */
    protected function buildSupplierGroup(int $supplierId, ?Supplier $supplier, Collection $bucket): array
    {
        $requisitions = $bucket->pluck('requisition')->unique('id')->values();
        $priceMap = $this->currentPricesForSupplier(
            $supplierId,
            $bucket->pluck('line')->values(),
        );

        $lines = [];
        foreach ($bucket as $entry) {
            /** @var PurchaseRequisition $requisition */
            $requisition = $entry['requisition'];
            /** @var PurchaseRequisitionLine $line */
            $line = $entry['line'];

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

        $projectIds = $requisitions->pluck('project_id')->filter()->unique();
        $projectId = $projectIds->count() === 1 ? $projectIds->first() : null;
        /** @var PurchaseRequisition $primary */
        $primary = $requisitions->first();

        $requiredByDates = $requisitions
            ->pluck('required_by')
            ->filter()
            ->map(fn ($date) => $date instanceof \Carbon\CarbonInterface ? $date->format('Y-m-d') : (string) $date)
            ->unique()
            ->values();

        return [
            'supplier_id' => $supplierId,
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
            'expected_delivery' => $requiredByDates->count() === 1 ? $requiredByDates->first() : null,
            'notes' => $requisitions->pluck('notes')->filter()->implode("\n\n"),
            'lines' => $lines,
        ];
    }

    /**
     * @param  Collection<int, PurchaseRequisitionLine>  $lines
     * @return array<int, float>
     */
    protected function currentPricesForSupplier(int $supplierId, Collection $lines): array
    {
        $itemIds = $lines
            ->pluck('warehouse_item_id')
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
