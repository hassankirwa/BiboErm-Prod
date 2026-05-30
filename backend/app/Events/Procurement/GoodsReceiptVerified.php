<?php

namespace App\Events\Procurement;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GoodsReceiptVerified
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, array{purchase_order_line_id: int, warehouse_item_id: ?int, qty_accepted: float, to_bin_id?: ?int}>  $acceptedLines
     */
    public function __construct(
        public int $goodsReceiptId,
        public int $purchaseOrderId,
        public ?int $projectId,
        public int $verifiedByUserId,
        public array $acceptedLines,
    ) {}
}
