<?php

namespace App\Listeners\Warehouse;

use App\Events\Procurement\GoodsReceiptVerified;
use App\Services\Warehouse\Movements\GrnReceiveService;

class ReceiveGoodsIntoWarehouse
{
    public function __construct(
        protected GrnReceiveService $grnReceive,
    ) {}

    public function handle(GoodsReceiptVerified $event): void
    {
        $this->grnReceive->handle($event);
    }
}
