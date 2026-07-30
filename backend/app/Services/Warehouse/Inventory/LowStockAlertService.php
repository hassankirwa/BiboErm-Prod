<?php

namespace App\Services\Warehouse\Inventory;

use App\Events\Warehouse\WarehouseLowStockDetected;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\WarehouseAuditLogger;
use Illuminate\Support\Facades\Cache;

class LowStockAlertService
{
    private const NOTIFY_CACHE_PREFIX = 'warehouse.low_stock.notified.';

    public function __construct(
        protected StockLevelCalculator $stockLevels,
        protected WarehouseAuditLogger $audit,
    ) {}

    /**
     * Detect low-stock SKUs without writing audit/notification side effects.
     *
     * @return list<array{item_id: int, sku: string, name: string, available: string, min_stock_qty: string}>
     */
    public function findAlerts(): array
    {
        $alerts = [];

        $items = Item::query()
            ->where('is_active', true)
            ->where('min_stock_qty', '>', 0)
            ->get();

        foreach ($items as $item) {
            $alert = $this->buildAlert($item);

            if ($alert === null) {
                continue;
            }

            $alerts[] = $alert;
        }

        return $alerts;
    }

    public function countAlerts(): int
    {
        return count($this->findAlerts());
    }

    /**
     * @return list<array{item_id: int, sku: string, name: string, available: string, min_stock_qty: string}>
     */
    public function scan(): array
    {
        $alerts = $this->findAlerts();

        foreach ($alerts as $alert) {
            $item = Item::query()->find($alert['item_id']);
            if ($item) {
                $this->recordLowStock($item, $alert['available']);
            }
        }

        return $alerts;
    }

    public function scanAfterMovement(int $itemId): void
    {
        $item = Item::query()->find($itemId);

        if (! $item || bccomp((string) $item->min_stock_qty, '0', 3) !== 1) {
            return;
        }

        $available = $this->stockLevels->availableForItem($item);

        if (bccomp($available, (string) $item->min_stock_qty, 3) < 0) {
            $this->recordLowStock($item, $available);
        }
    }

    /**
     * @return array{item_id: int, sku: string, name: string, available: string, min_stock_qty: string}|null
     */
    protected function buildAlert(Item $item): ?array
    {
        $available = $this->stockLevels->availableForItem($item);
        $minimum = (string) $item->min_stock_qty;

        if (bccomp($available, $minimum, 3) >= 0) {
            return null;
        }

        return [
            'item_id' => $item->id,
            'sku' => $item->sku,
            'name' => $item->name,
            'available' => $available,
            'min_stock_qty' => $minimum,
        ];
    }

    protected function recordLowStock(Item $item, string $available): void
    {
        $minimum = (string) $item->min_stock_qty;

        $this->audit->lowStockDetected($item->id, [
            'sku' => $item->sku,
            'available' => $available,
            'min_stock_qty' => $minimum,
        ]);

        if ($this->shouldNotify($item->id)) {
            event(new WarehouseLowStockDetected(
                warehouseItemId: $item->id,
                sku: $item->sku,
                name: $item->name,
                availableQty: $available,
                minStockQty: $minimum,
            ));

            Cache::put(self::NOTIFY_CACHE_PREFIX.$item->id, true, now()->addDay());
        }
    }

    protected function shouldNotify(int $itemId): bool
    {
        return ! Cache::has(self::NOTIFY_CACHE_PREFIX.$itemId);
    }
}
