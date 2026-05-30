<?php

namespace App\Events\Warehouse;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WarehouseLowStockDetected
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public int $warehouseItemId,
        public string $sku,
        public string $name,
        public string $availableQty,
        public string $minStockQty,
    ) {}
}
