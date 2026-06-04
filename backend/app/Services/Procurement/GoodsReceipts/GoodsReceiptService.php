<?php

namespace App\Services\Procurement\GoodsReceipts;

use App\Enums\Procurement\GoodsReceiptStatus;
use App\Enums\Procurement\PurchaseOrderStatus;
use App\Events\Procurement\GoodsReceiptVerified;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\GoodsReceiptLine;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\User;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use App\Services\Procurement\ProcurementWarehouseItemResolver;
use App\Services\QualityControl\QcInspectionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GoodsReceiptService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
        protected GoodsReceiptVerificationService $verification,
        protected ProcurementWarehouseItemResolver $warehouseItems,
        protected GrnProcurementOnlyResolver $procurementOnly,
        protected QcInspectionService $qcInspections,
    ) {}

    public function loadForApi(GoodsReceipt $grn): GoodsReceipt
    {
        $this->warehouseItems->syncGoodsReceiptFromProcurement($grn);

        $grn = $grn->fresh([
            'lines.warehouseItem',
            'lines.purchaseOrderLine',
            'attachments',
            'purchaseOrder.lines',
            'purchaseOrder.supplier',
            'purchaseOrder.requisition.lines.projectBomLine',
            'creator',
        ]);

        return $this->procurementOnly->annotateGoodsReceipt($grn);
    }

    public function create(PurchaseOrder $order, User $user, array $data): GoodsReceipt
    {
        if ($order->goodsReceipts()->exists()) {
            throw ValidationException::withMessages([
                'purchase_order_id' => [
                    'A goods receipt already exists for this purchase order. Open the existing GRN to record quantities.',
                ],
            ]);
        }

        $order->loadMissing('lines');
        $this->warehouseItems->syncPurchaseOrderFromRequisition($order);
        $order->load('lines');

        $requisition = $order->requisition_id
            ? PurchaseRequisition::query()->with(['lines.projectBomLine'])->find($order->requisition_id)
            : null;

        return DB::transaction(function () use ($order, $user, $data, $requisition) {
            $grn = GoodsReceipt::query()->create([
                'grn_number' => $this->refs->grn(),
                'purchase_order_id' => $order->id,
                'project_id' => $data['project_id'] ?? null,
                'transport_order_id' => $data['transport_order_id'] ?? null,
                'status' => GoodsReceiptStatus::Pending,
                'received_at' => $data['received_at'] ?? now(),
                'notes' => $data['notes'] ?? null,
                'quality_inspection_notes' => $data['quality_inspection_notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($data['lines'] ?? [] as $line) {
                $poLine = $order->lines->firstWhere('id', $line['purchase_order_line_id']);

                GoodsReceiptLine::query()->create([
                    'goods_receipt_id' => $grn->id,
                    'purchase_order_line_id' => $line['purchase_order_line_id'],
                    'warehouse_item_id' => $line['warehouse_item_id']
                        ?? $poLine?->warehouse_item_id
                        ?? ($poLine ? $this->warehouseItems->resolveForPurchaseOrderLine($poLine, $requisition) : null),
                    'qty_received' => $line['qty_received'],
                    'qty_accepted' => $line['qty_accepted'] ?? $line['qty_received'],
                    'qty_rejected' => $line['qty_rejected'] ?? 0,
                    'rejection_reason' => $line['rejection_reason'] ?? null,
                    'to_bin_id' => $line['to_bin_id'] ?? null,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            $grn->update(['status' => GoodsReceiptStatus::Verifying]);

            $this->audit->log('grn.created', $grn);

            $this->qcInspections->ensureReceivingInspection($grn->id, $grn->project_id);

            return $grn->load(['lines', 'attachments']);
        });
    }

    public function updateLines(GoodsReceipt $grn, array $lines, array $header = []): GoodsReceipt
    {
        $this->warehouseItems->syncGoodsReceiptFromProcurement($grn);
        $grn->load(['lines.purchaseOrderLine', 'purchaseOrder']);

        $requisition = $grn->purchaseOrder?->requisition_id
            ? PurchaseRequisition::query()->with('lines')->find($grn->purchaseOrder->requisition_id)
            : null;

        foreach ($lines as $lineData) {
            $line = GoodsReceiptLine::query()
                ->with('purchaseOrderLine')
                ->where('goods_receipt_id', $grn->id)
                ->where('id', $lineData['id'])
                ->firstOrFail();

            $warehouseItemId = array_key_exists('warehouse_item_id', $lineData)
                ? $lineData['warehouse_item_id']
                : ($line->warehouse_item_id
                    ?? $line->purchaseOrderLine?->warehouse_item_id
                    ?? ($line->purchaseOrderLine
                        ? $this->warehouseItems->resolveForPurchaseOrderLine(
                            $line->purchaseOrderLine,
                            $grn->purchaseOrder?->requisition_id
                                ? PurchaseRequisition::query()
                                    ->with(['lines.projectBomLine'])
                                    ->find($grn->purchaseOrder->requisition_id)
                                : null,
                        )
                        : null));

            $updates = [
                'warehouse_item_id' => $warehouseItemId,
                'qty_received' => $lineData['qty_received'],
                'qty_accepted' => $lineData['qty_accepted'] ?? 0,
                'qty_rejected' => $lineData['qty_rejected'] ?? 0,
                'rejection_reason' => $lineData['rejection_reason'] ?? null,
                'notes' => $lineData['notes'] ?? null,
            ];

            if (array_key_exists('to_bin_id', $lineData)) {
                $updates['to_bin_id'] = $lineData['to_bin_id'];
            }

            $line->update($updates);

            if ($warehouseItemId) {
                $requisitionLine = $requisition?->lines->first(
                    fn ($reqLine) => trim((string) $reqLine->description)
                        === trim((string) $line->purchaseOrderLine?->description),
                );

                $this->warehouseItems->persistWarehouseItemLink(
                    $warehouseItemId,
                    $requisitionLine,
                    $line->purchaseOrderLine,
                    $line,
                );
            }
        }

        $headerUpdates = [];

        if (array_key_exists('notes', $header)) {
            $headerUpdates['notes'] = $header['notes'];
        }

        if (array_key_exists('quality_inspection_notes', $header)) {
            $headerUpdates['quality_inspection_notes'] = $header['quality_inspection_notes'];
        }

        if (array_key_exists('project_id', $header)) {
            $headerUpdates['project_id'] = $header['project_id'];
        }

        if ($headerUpdates !== []) {
            $grn->update($headerUpdates);
        }

        if ($grn->status === GoodsReceiptStatus::Pending) {
            $grn->update(['status' => GoodsReceiptStatus::Verifying]);
            $this->qcInspections->ensureReceivingInspection($grn->id, $grn->project_id);
        }

        return $grn->fresh(['lines', 'attachments', 'purchaseOrder.lines', 'purchaseOrder.supplier', 'creator']);
    }

    public function verify(GoodsReceipt $grn, User $user): GoodsReceipt
    {
        $this->warehouseItems->syncGoodsReceiptFromProcurement($grn);
        $grn->load([
            'lines.purchaseOrderLine',
            'attachments',
            'purchaseOrder.lines',
            'purchaseOrder.requisition.lines.projectBomLine',
        ]);
        $this->procurementOnly->annotateGoodsReceipt($grn);
        $this->verification->assertCanVerify($grn);

        return DB::transaction(function () use ($grn, $user) {
            $grn->update([
                'status' => GoodsReceiptStatus::Verified,
                'verified_at' => now(),
                'verified_by' => $user->id,
            ]);

            $acceptedLines = [];
            foreach ($grn->lines as $line) {
                $poLine = $line->purchaseOrderLine;
                if ($poLine) {
                    $poLine->increment('received_qty', (float) $line->qty_accepted);
                }
                $acceptedLines[] = [
                    'purchase_order_line_id' => $line->purchase_order_line_id,
                    'warehouse_item_id' => $line->warehouse_item_id,
                    'qty_accepted' => (float) $line->qty_accepted,
                    'to_bin_id' => $line->to_bin_id,
                ];
            }

            $order = $grn->purchaseOrder;
            if ($order) {
                $fullyReceived = $order->lines->every(fn ($l) => (float) $l->received_qty >= (float) $l->quantity);
                $order->update([
                    'status' => $fullyReceived ? PurchaseOrderStatus::Received : PurchaseOrderStatus::PartialReceived,
                    'delivered_at' => $fullyReceived ? now()->toDateString() : $order->delivered_at,
                ]);
            }

            GoodsReceiptVerified::dispatch(
                $grn->id,
                $grn->purchase_order_id,
                $grn->project_id,
                $user->id,
                $acceptedLines,
                $this->buildBomLineSummary($acceptedLines),
            );

            $this->audit->log('grn.verified', $grn);

            return $grn->fresh(['lines', 'attachments', 'purchaseOrder']);
        });
    }

    /**
     * @param  array<int, array{purchase_order_line_id: int, warehouse_item_id: ?int, qty_accepted: float, to_bin_id?: ?int}>  $acceptedLines
     * @return array<int, array{warehouse_item_id: int, qty_required: string, project_bom_line_id: null, required_length_mm: null, bom_line_ref: null}>
     */
    protected function buildBomLineSummary(array $acceptedLines): array
    {
        $totals = [];

        foreach ($acceptedLines as $line) {
            $itemId = $line['warehouse_item_id'] ?? null;

            if (! $itemId) {
                continue;
            }

            $totals[$itemId] = ($totals[$itemId] ?? 0.0) + (float) $line['qty_accepted'];
        }

        return collect($totals)
            ->map(fn (float $qtyAccepted, int $itemId) => [
                'warehouse_item_id' => $itemId,
                'qty_required' => number_format($qtyAccepted, 3, '.', ''),
                'project_bom_line_id' => null,
                'required_length_mm' => null,
                'bom_line_ref' => null,
            ])
            ->values()
            ->all();
    }
}
