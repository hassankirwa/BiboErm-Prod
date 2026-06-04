<?php

namespace App\Services\Procurement\PurchaseOrders;

use App\Enums\Procurement\PurchaseOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Models\Procurement\Driver;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseOrderLine;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\TransportOrder;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use App\Services\Procurement\ProcurementWarehouseItemResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
        protected ProcurementWarehouseItemResolver $warehouseItems,
    ) {}

    public function createFromRequisition(PurchaseRequisition $requisition, User $user, array $data): PurchaseOrder
    {
        if ($requisition->status !== RequisitionStatus::Approved) {
            throw ValidationException::withMessages(['requisition' => ['Requisition must be approved before creating a PO.']]);
        }

        if ($requisition->supplier_id && (int) $data['supplier_id'] !== (int) $requisition->supplier_id) {
            throw ValidationException::withMessages(['supplier_id' => ['Supplier must match the approved requisition supplier.']]);
        }

        if ($requisition->purchaseOrders()->exists()) {
            throw ValidationException::withMessages(['requisition' => ['A purchase order already exists for this requisition.']]);
        }

        return DB::transaction(function () use ($requisition, $user, $data) {
            $requisition->loadMissing(['lines.projectBomLine']);
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
                $reqLine = isset($line['requisition_line_id'])
                    ? $requisition->lines->firstWhere('id', (int) $line['requisition_line_id'])
                    : $requisition->lines->first(
                        fn ($reqLine) => trim((string) $reqLine->description) === trim((string) ($line['description'] ?? '')),
                    );

                $itemId = $this->warehouseItems->resolveFromRequisitionLine($reqLine)
                    ?? ($line['warehouse_item_id'] ?? null);

                $sku = $line['sku'] ?? null;
                if ($itemId) {
                    $item = Item::query()->find($itemId);
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

            if (! empty($data['transport'])) {
                $this->createTransportOrder($po, $user, $data['transport']);
            }

            $this->audit->log('po.created', $po);

            return $po->load(['lines', 'supplier', 'requisition', 'transportOrders.driver']);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $groups
     * @return list<PurchaseOrder>
     */
    public function createBatchFromDraftGroups(User $user, array $groups): array
    {
        return DB::transaction(function () use ($user, $groups) {
            $orders = [];

            foreach ($groups as $group) {
                $linesByRequisition = collect($group['lines'] ?? [])
                    ->groupBy(fn (array $line) => (int) ($line['requisition_id'] ?? ($group['requisition_ids'][0] ?? 0)));

                foreach ($linesByRequisition as $requisitionId => $lines) {
                    if (! $requisitionId) {
                        continue;
                    }

                    $primaryRequisition = PurchaseRequisition::query()->findOrFail($requisitionId);
                    $isFirstInGroup = $requisitionId === (int) ($group['requisition_ids'][0] ?? $requisitionId);

                    $orders[] = $this->createFromRequisition($primaryRequisition, $user, [
                        'supplier_id' => $group['supplier_id'],
                        'project_id' => $group['project_id'] ?? null,
                        'expected_delivery' => $group['expected_delivery'] ?? null,
                        'tax' => $isFirstInGroup ? ($group['tax'] ?? 0) : 0,
                        'lines' => $lines->values()->all(),
                        'transport' => $group['transport'] ?? null,
                    ]);
                }
            }

            return $orders;
        });
    }

    /**
     * @param  array<string, mixed>  $transport
     */
    protected function createTransportOrder(PurchaseOrder $po, User $user, array $transport): TransportOrder
    {
        $driverDetails = $this->resolveDriverDetails($transport);

        $order = TransportOrder::query()->create([
            'purchase_order_id' => $po->id,
            'transport_type' => $transport['transport_type'],
            'vehicle' => $driverDetails['vehicle'] ?? ($transport['vehicle'] ?? null),
            'driver_id' => $driverDetails['driver_id'] ?? ($transport['driver_id'] ?? null),
            'driver_name' => $driverDetails['driver_name'] ?? ($transport['driver_name'] ?? null),
            'driver_phone' => $driverDetails['driver_phone'] ?? ($transport['driver_phone'] ?? null),
            'expected_arrival' => $transport['expected_arrival'] ?? null,
            'notes' => $transport['notes'] ?? null,
            'transport_number' => $this->refs->transport(),
            'status' => 'scheduled',
            'created_by' => $user->id,
        ]);

        $this->audit->log('transport.scheduled', $order);

        return $order;
    }

    /**
     * @param  array<string, mixed>  $transport
     * @return array<string, mixed>
     */
    protected function resolveDriverDetails(array $transport): array
    {
        if (empty($transport['driver_id'])) {
            return [];
        }

        $driver = Driver::query()
            ->whereKey($transport['driver_id'])
            ->where('is_active', true)
            ->firstOrFail();

        return [
            'driver_id' => $driver->id,
            'driver_name' => $transport['driver_name'] ?? $driver->name,
            'driver_phone' => $transport['driver_phone'] ?? $driver->phone,
            'vehicle' => $transport['vehicle'] ?? $driver->vehicle_registration,
        ];
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
