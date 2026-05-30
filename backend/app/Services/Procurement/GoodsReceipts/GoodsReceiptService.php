<?php

namespace App\Services\Procurement\GoodsReceipts;

use App\Enums\Procurement\GoodsReceiptStatus;
use App\Enums\Procurement\PurchaseOrderStatus;
use App\Events\Procurement\GoodsReceiptVerified;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\GoodsReceiptLine;
use App\Models\Procurement\PurchaseOrder;
use App\Models\User;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Procurement\ProcurementReferenceGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GoodsReceiptService
{
    public function __construct(
        protected ProcurementReferenceGenerator $refs,
        protected ProcurementAuditLogger $audit,
        protected GoodsReceiptVerificationService $verification,
    ) {}

    public function create(PurchaseOrder $order, User $user, array $data): GoodsReceipt
    {
        return DB::transaction(function () use ($order, $user, $data) {
            $grn = GoodsReceipt::query()->create([
                'grn_number' => $this->refs->grn(),
                'purchase_order_id' => $order->id,
                'project_id' => $data['project_id'] ?? $order->project_id,
                'transport_order_id' => $data['transport_order_id'] ?? null,
                'status' => GoodsReceiptStatus::Pending,
                'received_at' => $data['received_at'] ?? now(),
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($data['lines'] ?? [] as $line) {
                GoodsReceiptLine::query()->create([
                    'goods_receipt_id' => $grn->id,
                    'purchase_order_line_id' => $line['purchase_order_line_id'],
                    'warehouse_item_id' => $line['warehouse_item_id'] ?? null,
                    'qty_received' => $line['qty_received'],
                    'qty_accepted' => $line['qty_accepted'] ?? 0,
                    'qty_rejected' => $line['qty_rejected'] ?? 0,
                    'rejection_reason' => $line['rejection_reason'] ?? null,
                    'to_bin_id' => $line['to_bin_id'] ?? null,
                    'notes' => $line['notes'] ?? null,
                ]);
            }

            $grn->update(['status' => GoodsReceiptStatus::Verifying]);

            $this->audit->log('grn.created', $grn);

            return $grn->load(['lines', 'attachments']);
        });
    }

    public function updateLines(GoodsReceipt $grn, array $lines): GoodsReceipt
    {
        foreach ($lines as $lineData) {
            $line = GoodsReceiptLine::query()
                ->where('goods_receipt_id', $grn->id)
                ->where('id', $lineData['id'])
                ->firstOrFail();

            $line->update([
                'qty_received' => $lineData['qty_received'],
                'qty_accepted' => $lineData['qty_accepted'] ?? 0,
                'qty_rejected' => $lineData['qty_rejected'] ?? 0,
                'rejection_reason' => $lineData['rejection_reason'] ?? null,
                'to_bin_id' => $lineData['to_bin_id'] ?? null,
                'notes' => $lineData['notes'] ?? null,
            ]);
        }

        if ($grn->status === GoodsReceiptStatus::Pending) {
            $grn->update(['status' => GoodsReceiptStatus::Verifying]);
        }

        return $grn->fresh(['lines', 'attachments']);
    }

    public function verify(GoodsReceipt $grn, User $user): GoodsReceipt
    {
        $grn->load(['lines', 'attachments', 'purchaseOrder.lines']);
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
            );

            $this->audit->log('grn.verified', $grn);

            return $grn->fresh(['lines', 'attachments', 'purchaseOrder']);
        });
    }
}
