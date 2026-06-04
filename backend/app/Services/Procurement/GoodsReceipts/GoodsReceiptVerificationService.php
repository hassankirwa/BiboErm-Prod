<?php

namespace App\Services\Procurement\GoodsReceipts;

use App\Enums\Procurement\AttachmentType;
use App\Enums\Procurement\GoodsReceiptStatus;
use App\Models\Procurement\GoodsReceipt;
use Illuminate\Validation\ValidationException;

class GoodsReceiptVerificationService
{
    public function canVerify(GoodsReceipt $grn): bool
    {
        $grn->loadMissing(['lines', 'attachments']);

        if ($grn->status !== GoodsReceiptStatus::Verifying) {
            return false;
        }

        if ($grn->lines->isEmpty()) {
            return false;
        }

        foreach ($grn->lines as $line) {
            if ($line->qty_received === null) {
                return false;
            }
            if ((float) $line->qty_accepted + (float) $line->qty_rejected !== (float) $line->qty_received) {
                return false;
            }
            if ((float) $line->qty_rejected > 0 && blank($line->rejection_reason)) {
                return false;
            }
            $procurementOnly = (bool) ($line->is_procurement_only ?? false);

            if ((float) $line->qty_accepted > 0 && empty($line->warehouse_item_id) && ! $procurementOnly) {
                return false;
            }
        }

        $types = $grn->attachments->pluck('type')->map(fn ($t) => $t instanceof AttachmentType ? $t->value : (string) $t);

        return $types->contains(AttachmentType::ReceiptPhoto->value)
            && $types->contains(AttachmentType::InvoicePhoto->value);
    }

    public function assertCanVerify(GoodsReceipt $grn): void
    {
        if (! $this->canVerify($grn)) {
            throw ValidationException::withMessages([
                'grn' => [
                    'GRN cannot be verified. Complete qty/quality checks, upload receipt and invoice photos, '
                    .'and link warehouse catalog items for stock lines (procurement-only items such as glass or add-ons do not need a warehouse link).',
                ],
            ]);
        }
    }
}
