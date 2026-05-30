<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Rubber;
use App\Services\Warehouse\Inventory\StockLevelCalculator;
use Illuminate\Support\Collection;

class RubberCompatibilityService
{
    public function __construct(
        protected StockLevelCalculator $stockLevels,
    ) {}
    /**
     * @return Collection<int, Item>
     */
    public function suggestForProfile(int $profileItemId): Collection
    {
        return Item::query()
            ->where('category', ItemCategory::Rubber)
            ->where('is_active', true)
            ->whereHas('rubber', function ($query) use ($profileItemId) {
                $query->whereJsonContains('compatible_profile_ids', $profileItemId);
            })
            ->with(['rubber', 'stockLevels'])
            ->orderBy('sku')
            ->get();
    }

    /**
     * @return list<array{warehouse_item_id: int, sku: string, name: string, available: string}>
     */
    public function suggestForBomLine(int $warehouseItemId): array
    {
        $item = Item::query()->find($warehouseItemId);

        if (! $item instanceof Item) {
            return [];
        }

        if ($item->category === ItemCategory::Rubber) {
            return [[
                'warehouse_item_id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'available' => $this->stockLevels->availableForItem($item),
            ]];
        }

        if ($item->category !== ItemCategory::AluminiumProfile) {
            return [];
        }

        return $this->suggestForProfile($item->id)
            ->map(fn (Item $rubber) => [
                'warehouse_item_id' => $rubber->id,
                'sku' => $rubber->sku,
                'name' => $rubber->name,
                'available' => app(StockLevelCalculator::class)->availableForItem($rubber),
            ])
            ->values()
            ->all();
    }

    public function profileIdsForRubberItem(Item $rubberItem): array
    {
        if ($rubberItem->category !== ItemCategory::Rubber) {
            return [];
        }

        $rubber = Rubber::query()->where('item_id', $rubberItem->id)->first();

        return $rubber?->compatible_profile_ids ?? [];
    }

    public function isCompatible(int $rubberItemId, int $profileItemId): bool
    {
        return in_array($profileItemId, $this->profileIdsForRubberItem(
            Item::query()->findOrFail($rubberItemId)
        ), true);
    }
}
