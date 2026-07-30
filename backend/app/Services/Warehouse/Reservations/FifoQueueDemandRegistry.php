<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Item;
use Illuminate\Support\Facades\Cache;

class FifoQueueDemandRegistry
{
    private const CACHE_PREFIX = 'warehouse.fifo_queue_demand.';

    public function __construct(
        protected AluminiumBarDemandService $aluminiumDemand,
    ) {}

    /**
     * @param  array<int, array{item_id: int, quantity: string|float, required_length_mm?: int|null}>  $bomLines
     */
    public function record(int $projectId, array $bomLines): void
    {
        $demands = [];

        $itemIds = array_values(array_unique(array_map(
            fn (array $line) => (int) $line['item_id'],
            $bomLines
        )));

        $items = Item::query()
            ->whereIn('id', $itemIds)
            ->with('aluminiumProfile')
            ->get()
            ->keyBy('id');

        $aluminiumPlans = $this->aluminiumDemand->plansByItemId($items, $bomLines);
        $aluminiumHandled = [];

        foreach ($bomLines as $line) {
            $itemId = (int) $line['item_id'];
            $item = $items->get($itemId);

            if ($item?->category === ItemCategory::AluminiumProfile) {
                if (isset($aluminiumHandled[$itemId])) {
                    continue;
                }
                $aluminiumHandled[$itemId] = true;
                $demands[$itemId] = (string) ($aluminiumPlans[$itemId]['reserve_qty'] ?? '0.000');
                continue;
            }

            $demands[$itemId] = bcadd(
                $demands[$itemId] ?? '0.000',
                (string) $line['quantity'],
                3
            );
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
