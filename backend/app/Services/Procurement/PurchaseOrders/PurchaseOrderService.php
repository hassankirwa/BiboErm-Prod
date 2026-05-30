<?php

namespace App\Services\Procurement\PurchaseOrders;

use App\Enums\Procurement\PurchaseOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Models\InventoryItem;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseOrderLine;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\User;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
    ) {}

    public function createFromRequisition(PurchaseRequisition $requisition, User $user, array $data): PurchaseOrder
    {
        if ($requisition->status !== RequisitionStatus::Approved) {
            throw ValidationException::withMessages(['requisition' => ['Requisition must be approved before creating a PO.']]);
        }

        return DB::transaction(function () use ($requisition, $user, $data) {
            $lines = $data['lines'] ?? [];
            $subtotal = 0;

            $po = PurchaseOrder::query()->create([
                'reference' => $this->refs->purchaseOrder(),
                'supplier_id' => $data['supplier_id'],
                'project_id' => $data['project_id'] ?? $requisition->project_id,
                'requisition_id' => $requisition->id,
                'status' => PurchaseOrderStatus::Draft,
                'expected_delivery' => $data['expected_delivery'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($lines as $line) {
                $itemId = $line['warehouse_item_id'] ?? null;
                $sku = $line['sku'] ?? null;
                if ($itemId) {
                    $item = InventoryItem::query()->find($itemId);
                    $sku = $sku ?? $item?->sku;
                }
                $qty = (float) ($line['quantity'] ?? 0);
                $unitPrice = (float) ($line['unit_price'] ?? 0);
                $lineTotal = round($qty * $unitPrice, 2);
                $subtotal += $lineTotal;

                PurchaseOrderLine::query()->create([
                    'purchase_order_id' => $po->id,
                    'warehouse_item_id' => $itemId,
                    'description' => $line['description'],
                    'sku' => $sku,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ]);
            }

            $tax = (float) ($data['tax'] ?? 0);
            $po->update([
                'subtotal' => $subtotal,
                'tax' => $tax,
                'total' => $subtotal + $tax,
            ]);

            $this->audit->log('po.created', $po);

            return $po->load(['lines', 'supplier', 'requisition']);
        });
    }

    public function approve(PurchaseOrder $order, User $user): PurchaseOrder
    {
        if (! in_array($order->status, [PurchaseOrderStatus::Draft, PurchaseOrderStatus::PendingApproval], true)) {
            throw ValidationException::withMessages(['status' => ['PO cannot be approved in current status.']]);
        }

        $order->update([
            'status' => PurchaseOrderStatus::Approved,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $this->audit->log('po.approved', $order);

        return $order->fresh(['lines', 'supplier']);
    }

    public function send(PurchaseOrder $order): PurchaseOrder
    {
        if ($order->status !== PurchaseOrderStatus::Approved) {
            throw ValidationException::withMessages(['status' => ['PO must be approved before sending.']]);
        }

        $order->update([
            'status' => PurchaseOrderStatus::Sent,
            'sent_at' => now(),
        ]);

        $this->audit->log('po.sent', $order);

        return $order->fresh(['lines', 'supplier']);
    }
}
