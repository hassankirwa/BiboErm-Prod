<?php

namespace App\Notifications\Warehouse;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LowStockNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $warehouseItemId,
        public string $sku,
        public string $name,
        public string $availableQty,
        public string $minStockQty,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'warehouse.low_stock',
            'warehouse_item_id' => $this->warehouseItemId,
            'sku' => $this->sku,
            'name' => $this->name,
            'available_qty' => $this->availableQty,
            'min_stock_qty' => $this->minStockQty,
            'message' => "{$this->sku} ({$this->name}) is below minimum stock: {$this->availableQty} available, {$this->minStockQty} required.",
        ];
    }
}
