<?php

namespace App\Services\Warehouse\Inventory;

use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use Illuminate\Support\Collection;

class StockLevelCalculator
{
    /**
     * @param  list<int>  $itemIds
     * @return array<int, array{on_hand: string, reserved: string, available: string}>
     */
    public function totalsForItemIds(array $itemIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $itemIds))));
        if ($ids === []) {
            return [];
        }

        $rows = StockLevel::query()
            ->selectRaw('item_id, coalesce(sum(quantity_on_hand), 0) as on_hand, coalesce(sum(quantity_reserved), 0) as reserved')
            ->whereIn('item_id', $ids)
            ->groupBy('item_id')
            ->get()
            ->keyBy('item_id');

        $totals = [];
        foreach ($ids as $id) {
            $onHand = number_format((float) ($rows->get($id)?->on_hand ?? 0), 3, '.', '');
            $reserved = number_format((float) ($rows->get($id)?->reserved ?? 0), 3, '.', '');
            $totals[$id] = [
                'on_hand' => $onHand,
                'reserved' => $reserved,
                'available' => bcsub($onHand, $reserved, 3),
            ];
        }

        return $totals;
    }

    public function availableForItem(Item $item): string
    {
        $levels = StockLevel::query()
            ->where('item_id', $item->id)
            ->get();

        return $this->sumAvailable($levels);
    }

    public function availableAtBin(int $itemId, int $binId): string
    {
        $level = StockLevel::query()
            ->where('item_id', $itemId)
            ->where('bin_id', $binId)
            ->first();

        return $level ? $level->availableQuantity() : '0.000';
    }

    public function totalOnHand(Item $item): string
    {
        return (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->sum('quantity_on_hand');
    }

    public function totalReserved(Item $item): string
    {
        return (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->sum('quantity_reserved');
    }

    /**
     * @return Collection<int, StockLevel>
     */
    public function binsWithAvailableStock(int $itemId, ?int $preferredBinId = null): Collection
    {
        $levels = StockLevel::query()
            ->where('item_id', $itemId)
            ->with('bin.section.deck')
            ->get()
            ->filter(fn (StockLevel $level) => bccomp($level->availableQuantity(), '0', 3) === 1);

        if ($preferredBinId) {
            $preferredSectionId = Bin::query()->whereKey($preferredBinId)->value('section_id');

            return $levels
                ->sortByDesc(fn (StockLevel $level) => match (true) {
                    $level->bin_id === $preferredBinId => 2,
                    $preferredSectionId && $level->bin?->section_id === $preferredSectionId => 1,
                    default => 0,
                })
                ->values();
        }

        return $levels->sortBy(fn (StockLevel $level) => $level->bin_id)->values();
    }

    /**
     * @param  Collection<int, StockLevel>  $levels
     */
    public function sumAvailable(Collection $levels): string
    {
        return $levels->reduce(
            fn (string $carry, StockLevel $level) => bcadd($carry, $level->availableQuantity(), 3),
            '0.000'
        );
    }

    public function getOrCreateLevel(int $itemId, int $binId): StockLevel
    {
        return StockLevel::query()->firstOrCreate(
            ['item_id' => $itemId, 'bin_id' => $binId],
            ['quantity_on_hand' => 0, 'quantity_reserved' => 0, 'updated_at' => now()]
        );
    }

    public function incrementOnHand(int $itemId, int $binId, string $quantity): void
    {
        $level = $this->getOrCreateLevel($itemId, $binId);
        $level->quantity_on_hand = bcadd((string) $level->quantity_on_hand, $quantity, 3);
        $level->updated_at = now();
        $level->save();
    }

    public function assertSufficientAvailable(int $itemId, int $binId, string $quantity): void
    {
        $available = $this->availableAtBin($itemId, $binId);

        if (bccomp($available, $quantity, 3) < 0) {
            throw new \InvalidArgumentException('Insufficient available quantity.');
        }
    }

    public function decrementOnHand(int $itemId, int $binId, string $quantity): void
    {
        $level = $this->getOrCreateLevel($itemId, $binId);

        if (bccomp((string) $level->quantity_on_hand, $quantity, 3) < 0) {
            throw new \InvalidArgumentException('Insufficient on-hand quantity.');
        }

        $level->quantity_on_hand = bcsub((string) $level->quantity_on_hand, $quantity, 3);
        $level->updated_at = now();
        $level->save();
    }

    public function incrementReserved(int $itemId, int $binId, string $quantity): void
    {
        $level = $this->getOrCreateLevel($itemId, $binId);

        if (bccomp($level->availableQuantity(), $quantity, 3) < 0) {
            throw new \InvalidArgumentException('Insufficient available quantity to reserve.');
        }

        $level->quantity_reserved = bcadd((string) $level->quantity_reserved, $quantity, 3);
        $level->updated_at = now();
        $level->save();
    }

    public function decrementReserved(int $itemId, int $binId, string $quantity): void
    {
        $level = $this->getOrCreateLevel($itemId, $binId);

        if (bccomp((string) $level->quantity_reserved, $quantity, 3) < 0) {
            throw new \InvalidArgumentException('Cannot release more than reserved quantity.');
        }

        $level->quantity_reserved = bcsub((string) $level->quantity_reserved, $quantity, 3);
        $level->updated_at = now();
        $level->save();
    }
}
