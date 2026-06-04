<?php

namespace App\Services\Warehouse\Movements;

use App\Events\Procurement\GoodsReceiptVerified;
use App\Models\User;
use App\Models\Warehouse\StockMovement;
use App\Services\Warehouse\Inventory\PutawayBinResolver;

class GrnReceiveService
{
    public function __construct(
        protected StockMovementService $movements,
        protected PutawayBinResolver $putawayBins,
        protected GrnReservationFulfillmentService $fulfillment,
    ) {}

    public function handle(GoodsReceiptVerified $event): ?StockMovement
    {
        $user = User::query()->findOrFail($event->verifiedByUserId);

        $lines = array_values(array_filter(array_map(function (array $line) {
            $itemId = (int) ($line['warehouse_item_id'] ?? 0);
            $quantity = (string) ($line['qty_accepted'] ?? 0);

            if ($itemId <= 0 || bccomp($quantity, '0', 3) <= 0) {
                return null;
            }

            return [
                'item_id' => $itemId,
                'to_bin_id' => $this->putawayBins->resolve(
                    $itemId,
                    isset($line['to_bin_id']) ? (int) $line['to_bin_id'] : null
                ),
                'quantity' => $quantity,
            ];
        }, $event->acceptedLines)));

        if ($lines === []) {
            return null;
        }

        $movement = $this->movements->receive(
            performer: $user,
            lines: $lines,
            referenceType: 'goods_receipt',
            referenceId: $event->goodsReceiptId,
            notes: "GRN #{$event->goodsReceiptId} verified",
        );

        if ($event->projectId && $event->bomLineSummary !== []) {
            $this->fulfillment->attemptFulfillment(
                projectId: $event->projectId,
                user: $user,
                goodsReceiptId: $event->goodsReceiptId,
                acceptedLines: $event->acceptedLines,
                bomLineSummary: $event->bomLineSummary,
            );
        }

        return $movement;
    }
}
