<?php

namespace App\Services\Procurement\GoodsReceipts;

use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\GoodsReceiptLine;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;

/**
 * Glass, client add-ons, and other BOM lines flagged procurement-only are bought through
 * procurement but never stored in warehouse bins.
 */
class GrnProcurementOnlyResolver
{
    public function forLine(GoodsReceiptLine $line, ?PurchaseOrder $order): bool
    {
        if (! $order?->requisition_id) {
            return false;
        }

        $requisitionLine = $this->matchRequisitionLine($order, $line->purchaseOrderLine?->description, $line->purchaseOrderLine?->sku);

        return (bool) $requisitionLine?->projectBomLine?->is_procurement_only;
    }

    public function annotateGoodsReceipt(GoodsReceipt $grn): GoodsReceipt
    {
        $grn->loadMissing([
            'lines.purchaseOrderLine',
            'purchaseOrder.requisition.lines.projectBomLine',
        ]);

        foreach ($grn->lines as $line) {
            $line->setAttribute(
                'is_procurement_only',
                $this->forLine($line, $grn->purchaseOrder),
            );
        }

        return $grn;
    }

    protected function matchRequisitionLine(
        PurchaseOrder $order,
        ?string $description,
        ?string $sku,
    ): ?PurchaseRequisitionLine {
        $requisition = $order->relationLoaded('requisition')
            ? $order->requisition
            : PurchaseRequisition::query()->with(['lines.projectBomLine'])->find($order->requisition_id);

        if (! $requisition) {
            return null;
        }

        if ($sku) {
            $bySku = $requisition->lines->first(fn (PurchaseRequisitionLine $line) => $line->sku === $sku);

            if ($bySku) {
                return $bySku;
            }
        }

        if ($description) {
            $normalized = trim($description);

            return $requisition->lines->first(
                fn (PurchaseRequisitionLine $line) => trim((string) $line->description) === $normalized,
            );
        }

        return $requisition->lines->count() === 1 ? $requisition->lines->first() : null;
    }
}
