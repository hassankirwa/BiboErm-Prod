<?php

namespace App\Services\Procurement;

use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\GoodsReceiptLine;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseOrderLine;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\ProjectBomLine;
use App\Models\Warehouse\Item;

class ProcurementWarehouseItemResolver
{
    public function resolveFromRequisitionLine(?PurchaseRequisitionLine $line): ?int
    {
        if (! $line) {
            return null;
        }

        if ($line->warehouse_item_id) {
            return (int) $line->warehouse_item_id;
        }

        $line->loadMissing('projectBomLine');

        return $this->resolveFromBomLine($line->projectBomLine);
    }

    public function resolveFromBomLine(?ProjectBomLine $bomLine): ?int
    {
        if (! $bomLine) {
            return null;
        }

        if ($bomLine->warehouse_item_id) {
            return (int) $bomLine->warehouse_item_id;
        }

        if ($bomLine->material_code) {
            $bySku = Item::query()
                ->where('sku', $bomLine->material_code)
                ->where('is_active', true)
                ->value('id');

            if ($bySku) {
                return (int) $bySku;
            }
        }

        $name = trim((string) $bomLine->material_name);
        if ($name !== '') {
            $byName = Item::query()
                ->where('is_active', true)
                ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
                ->value('id');

            if ($byName) {
                return (int) $byName;
            }
        }

        return null;
    }

    public function persistWarehouseItemLink(
        int $warehouseItemId,
        ?PurchaseRequisitionLine $requisitionLine = null,
        ?PurchaseOrderLine $purchaseOrderLine = null,
        ?GoodsReceiptLine $goodsReceiptLine = null,
    ): void {
        if ($requisitionLine) {
            if (! $requisitionLine->warehouse_item_id) {
                $requisitionLine->update(['warehouse_item_id' => $warehouseItemId]);
            }

            $requisitionLine->loadMissing('projectBomLine');
            if ($requisitionLine->projectBomLine && ! $requisitionLine->projectBomLine->warehouse_item_id) {
                $requisitionLine->projectBomLine->update(['warehouse_item_id' => $warehouseItemId]);
            }
        }

        if ($purchaseOrderLine && ! $purchaseOrderLine->warehouse_item_id) {
            $purchaseOrderLine->update(['warehouse_item_id' => $warehouseItemId]);
        }

        if ($goodsReceiptLine && ! $goodsReceiptLine->warehouse_item_id) {
            $goodsReceiptLine->update(['warehouse_item_id' => $warehouseItemId]);
        }
    }

    public function resolveForPurchaseOrderLine(
        PurchaseOrderLine $poLine,
        ?PurchaseRequisition $requisition = null,
    ): ?int {
        if ($poLine->warehouse_item_id) {
            return (int) $poLine->warehouse_item_id;
        }

        if (! $requisition) {
            return null;
        }

        $requisition->loadMissing(['lines.projectBomLine']);

        $reqLine = $this->matchRequisitionLine($requisition, $poLine->description, $poLine->sku);

        return $this->resolveFromRequisitionLine($reqLine);
    }

    /**
     * Propagate resolved warehouse item IDs across PO lines and open GRN lines.
     */
    public function syncPurchaseOrderFromRequisition(PurchaseOrder $order): void
    {
        if (! $order->requisition_id) {
            return;
        }

        $requisition = PurchaseRequisition::query()
            ->with(['lines.projectBomLine'])
            ->find($order->requisition_id);

        if (! $requisition) {
            return;
        }

        $order->loadMissing('lines');

        foreach ($order->lines as $poLine) {
            $itemId = $this->resolveForPurchaseOrderLine($poLine, $requisition);

            if ($itemId && ! $poLine->warehouse_item_id) {
                $poLine->update(['warehouse_item_id' => $itemId]);
            }
        }
    }

    public function syncGoodsReceiptFromProcurement(GoodsReceipt $grn): void
    {
        $grn->loadMissing(['lines.purchaseOrderLine', 'purchaseOrder']);

        $requisition = $grn->purchaseOrder?->requisition_id
            ? PurchaseRequisition::query()->with(['lines.projectBomLine'])->find($grn->purchaseOrder->requisition_id)
            : null;

        if ($grn->purchaseOrder) {
            $this->syncPurchaseOrderFromRequisition($grn->purchaseOrder);
            $grn->load(['lines.purchaseOrderLine', 'purchaseOrder.lines']);
        }

        foreach ($grn->lines as $grnLine) {
            $itemId = $grnLine->warehouse_item_id
                ? (int) $grnLine->warehouse_item_id
                : $this->resolveForPurchaseOrderLine($grnLine->purchaseOrderLine, $requisition);

            if (! $itemId) {
                continue;
            }

            if (! $grnLine->warehouse_item_id) {
                $grnLine->update(['warehouse_item_id' => $itemId]);
            }

            if ($grnLine->purchaseOrderLine && ! $grnLine->purchaseOrderLine->warehouse_item_id) {
                $grnLine->purchaseOrderLine->update(['warehouse_item_id' => $itemId]);
            }
        }
    }

    protected function matchRequisitionLine(
        PurchaseRequisition $requisition,
        ?string $description,
        ?string $sku,
    ): ?PurchaseRequisitionLine {
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
