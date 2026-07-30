<?php

namespace App\Services\Procurement\PurchaseOrders;

use App\Enums\Procurement\PurchaseOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Models\Procurement\Driver;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseOrderLine;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Procurement\TransportOrder;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Services\Procurement\DriverOccupancyService;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use App\Services\Procurement\ProcurementWarehouseItemResolver;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
        protected ProcurementWarehouseItemResolver $warehouseItems,
        protected DriverOccupancyService $occupancy,
    ) {}

    public function createFromRequisition(PurchaseRequisition $requisition, User $user, array $data): PurchaseOrder
    {
        if ($requisition->status !== RequisitionStatus::Approved) {
            throw ValidationException::withMessages(['requisition' => ['Requisition must be approved before creating a PO.']]);
        }

        $requisition->loadMissing(['lines.preferredSupplier', 'purchaseOrders.lines']);

        $lines = $data['lines'] ?? [];
        if ($lines === []) {
            throw ValidationException::withMessages(['lines' => ['Add at least one purchase order line.']]);
        }

        $resolvedLines = $this->resolveRequisitionLines($requisition, $lines);
        $this->assertLinesNotAlreadyOrdered($requisition, $resolvedLines);
        $this->assertSupplierMatchesLines($requisition, (int) $data['supplier_id'], $resolvedLines);

        foreach ($resolvedLines as $entry) {
            $qty = (float) ($entry['payload']['quantity'] ?? 0);
            if ($qty <= 0) {
                throw ValidationException::withMessages([
                    'lines' => ['Each purchase order line needs a quantity greater than zero.'],
                ]);
            }
        }

        return DB::transaction(function () use ($requisition, $user, $data, $resolvedLines) {
            $subtotal = 0;

            $po = PurchaseOrder::query()->create([
                'reference' => $this->refs->purchaseOrder(),
                'supplier_id' => $data['supplier_id'],
                'project_id' => $data['project_id'] ?? $requisition->project_id,
                'requisition_id' => $requisition->id,
                'status' => PurchaseOrderStatus::Draft,
                'expected_delivery' => $data['expected_delivery'] ?? $requisition->required_by,
                'created_by' => $user->id,
            ]);

            foreach ($resolvedLines as $entry) {
                /** @var PurchaseRequisitionLine|null $reqLine */
                $reqLine = $entry['requisition_line'];
                $line = $entry['payload'];

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
                    'requisition_line_id' => $reqLine?->id,
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
                        'transport' => $isFirstInGroup ? ($group['transport'] ?? null) : null,
                    ]);
                }
            }

            return $orders;
        });
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     * @return list<array{payload: array<string, mixed>, requisition_line: ?PurchaseRequisitionLine}>
     */
    protected function resolveRequisitionLines(PurchaseRequisition $requisition, array $lines): array
    {
        $resolved = [];

        foreach ($lines as $line) {
            $reqLine = null;
            if (isset($line['requisition_line_id'])) {
                $reqLine = $requisition->lines->firstWhere('id', (int) $line['requisition_line_id']);
                if (! $reqLine) {
                    throw ValidationException::withMessages([
                        'lines' => ["Requisition line {$line['requisition_line_id']} does not belong to {$requisition->reference}."],
                    ]);
                }
            } else {
                $reqLine = $requisition->lines->first(
                    fn ($candidate) => trim((string) $candidate->description) === trim((string) ($line['description'] ?? '')),
                );
            }

            $resolved[] = [
                'payload' => $line,
                'requisition_line' => $reqLine,
            ];
        }

        return $resolved;
    }

    /**
     * @param  list<array{payload: array<string, mixed>, requisition_line: ?PurchaseRequisitionLine}>  $resolvedLines
     */
    protected function assertLinesNotAlreadyOrdered(PurchaseRequisition $requisition, array $resolvedLines): void
    {
        $orderedIds = array_flip($requisition->orderedRequisitionLineIds());
        $lineIds = collect($resolvedLines)
            ->map(fn (array $entry) => $entry['requisition_line']?->id)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($lineIds->isEmpty()) {
            // Legacy create without line ids: only allow when no POs exist yet.
            if ($requisition->purchaseOrders->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'requisition' => ['A purchase order already exists for this requisition. Provide requisition_line_id values for remaining uncovered lines.'],
                ]);
            }

            return;
        }

        $duplicates = $lineIds->filter(fn (int $id) => isset($orderedIds[$id]))->values();
        if ($duplicates->isNotEmpty()) {
            throw ValidationException::withMessages([
                'lines' => ['One or more requisition lines already belong to a purchase order.'],
            ]);
        }
    }

    /**
     * @param  list<array{payload: array<string, mixed>, requisition_line: ?PurchaseRequisitionLine}>  $resolvedLines
     */
    protected function assertSupplierMatchesLines(
        PurchaseRequisition $requisition,
        int $supplierId,
        array $resolvedLines,
    ): void {
        $headerSupplierId = $requisition->supplier_id ? (int) $requisition->supplier_id : null;

        /** @var Collection<int, PurchaseRequisitionLine> $reqLines */
        $reqLines = collect($resolvedLines)
            ->map(fn (array $entry) => $entry['requisition_line'])
            ->filter();

        if ($reqLines->isEmpty()) {
            if ($headerSupplierId && $headerSupplierId !== $supplierId) {
                throw ValidationException::withMessages([
                    'supplier_id' => ['Supplier must match the approved requisition supplier.'],
                ]);
            }

            if (! $headerSupplierId) {
                throw ValidationException::withMessages([
                    'supplier_id' => ['Assign a supplier on the requisition before creating a purchase order.'],
                ]);
            }

            return;
        }

        foreach ($reqLines as $reqLine) {
            $expected = $reqLine->effectiveSupplierId($headerSupplierId);
            if (! $expected) {
                throw ValidationException::withMessages([
                    'supplier_id' => [
                        "Line \"{$reqLine->description}\" has no supplier. Set a preferred supplier or requisition default supplier.",
                    ],
                ]);
            }

            if ($expected !== $supplierId) {
                throw ValidationException::withMessages([
                    'supplier_id' => [
                        "Line \"{$reqLine->description}\" is assigned to a different supplier.",
                    ],
                ]);
            }
        }
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

        $this->occupancy->assertAvailable($driver);

        return [
            'driver_id' => $driver->id,
            'driver_name' => $transport['driver_name'] ?? $driver->name,
            'driver_phone' => $transport['driver_phone'] ?? $driver->phone,
            'vehicle' => $transport['vehicle'] ?? $driver->vehicle_registration,
        ];
    }

    /**
     * Update an editable (pre-approve) purchase order header and/or lines.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateEditable(PurchaseOrder $order, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($order, $data) {
            $locked = PurchaseOrder::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $locked->isEditable()) {
                throw ValidationException::withMessages([
                    'status' => ['Only draft or pending-approval purchase orders can be updated.'],
                ]);
            }

            $header = [];
            if (array_key_exists('supplier_id', $data)) {
                $header['supplier_id'] = $data['supplier_id'];
            }
            if (array_key_exists('expected_delivery', $data)) {
                $header['expected_delivery'] = $data['expected_delivery'];
            }
            if (array_key_exists('tax', $data)) {
                $header['tax'] = $data['tax'];
            }
            if ($header !== []) {
                $locked->update($header);
            }

            if (isset($data['lines']) && is_array($data['lines'])) {
                $this->applyLineUpdates($locked, $data['lines']);
            }

            $this->recalculateTotals($locked);

            $this->audit->log('po.updated', $locked);

            return $locked->fresh(['lines', 'supplier', 'project', 'requisition', 'transportOrders.driver']);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     */
    protected function applyLineUpdates(PurchaseOrder $order, array $lines): void
    {
        foreach ($lines as $lineData) {
            if (! isset($lineData['id'])) {
                throw ValidationException::withMessages([
                    'lines' => ['Every line update must include its id.'],
                ]);
            }

            $line = $order->lines()->whereKey((int) $lineData['id'])->first();
            if (! $line) {
                throw ValidationException::withMessages([
                    'lines' => ["Line {$lineData['id']} does not belong to this purchase order."],
                ]);
            }

            $updates = [];
            if (array_key_exists('quantity', $lineData)) {
                $updates['quantity'] = $lineData['quantity'];
            }
            if (array_key_exists('unit_price', $lineData)) {
                $updates['unit_price'] = $lineData['unit_price'];
            }
            if (array_key_exists('description', $lineData)) {
                $updates['description'] = $lineData['description'];
            }
            if (array_key_exists('sku', $lineData)) {
                $updates['sku'] = $lineData['sku'];
            }

            if ($updates === []) {
                continue;
            }

            $qty = (float) ($updates['quantity'] ?? $line->quantity);
            $unitPrice = (float) ($updates['unit_price'] ?? $line->unit_price);
            if ($qty <= 0) {
                throw ValidationException::withMessages([
                    'lines' => ['Each purchase order line needs a quantity greater than zero.'],
                ]);
            }

            $updates['line_total'] = round($qty * $unitPrice, 2);
            $line->update($updates);
        }
    }

    protected function recalculateTotals(PurchaseOrder $order): void
    {
        $subtotal = (float) $order->lines()->sum('line_total');
        $tax = (float) $order->tax;
        $order->update([
            'subtotal' => $subtotal,
            'total' => $subtotal + $tax,
        ]);
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
