<?php

namespace App\Events\Procurement;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GoodsReceiptVerified
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, array{purchase_order_line_id?: int|null, warehouse_item_id: int, qty_accepted: string|float, to_bin_id?: int|null}>  $acceptedLines
     * @param  array<int, array{warehouse_item_id: int, qty_required: string|float, required_length_mm?: int|null, bom_line_ref?: string|null, project_bom_line_id?: int|null}>  $bomLineSummary
     */
    public function __construct(
        public int $goodsReceiptId,
        public int $purchaseOrderId,
        public ?int $projectId,
        public int $verifiedByUserId,
        public array $acceptedLines,
        public array $bomLineSummary = [],
    ) {}
}
