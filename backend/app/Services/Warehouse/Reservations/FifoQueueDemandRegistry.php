<?php

namespace App\Services\Warehouse\Reservations;

use Illuminate\Support\Facades\Cache;

class FifoQueueDemandRegistry
{
    private const CACHE_PREFIX = 'warehouse.fifo_queue_demand.';

    /**
     * @param  array<int, array{item_id: int, quantity: string|float}>  $bomLines
     */
    public function record(int $projectId, array $bomLines): void
    {
        $demands = [];

        foreach ($bomLines as $line) {
            $itemId = (int) $line['item_id'];
            $demands[$itemId] = (string) $line['quantity'];
        }

        Cache::put(self::CACHE_PREFIX.$projectId, $demands, now()->addDays(30));
    }

    public function clear(int $projectId): void
    {
        Cache::forget(self::CACHE_PREFIX.$projectId);
    }

    public function demandForItem(int $projectId, int $itemId): string
    {
        /** @var array<int, string> $demands */
        $demands = Cache::get(self::CACHE_PREFIX.$projectId, []);

        return (string) ($demands[$itemId] ?? '0');
    }
}
