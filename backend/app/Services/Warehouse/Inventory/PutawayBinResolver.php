<?php

namespace App\Services\Warehouse\Inventory;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Rubber;
use App\Models\Warehouse\StockLevel;

class PutawayBinResolver
{
    public function resolve(int $warehouseItemId, ?int $toBinId = null): int
    {
        if ($toBinId !== null) {
            return $toBinId;
        }

        $item = Item::query()->findOrFail($warehouseItemId);

        if ($item->category === ItemCategory::Accessory) {
            $binId = Accessory::query()->where('item_id', $item->id)->value('default_bin_id');
            if ($binId) {
                return (int) $binId;
            }
        }

        if ($item->category === ItemCategory::Rubber) {
            $sectionId = Rubber::query()->where('item_id', $item->id)->value('default_section_id');
            if ($sectionId) {
                $binId = StockLevel::query()
                    ->where('item_id', $item->id)
                    ->whereHas('bin', fn ($q) => $q->where('section_id', $sectionId))
                    ->orderByDesc('quantity_on_hand')
                    ->value('bin_id');

                if ($binId) {
                    return (int) $binId;
                }
            }
        }

        $existing = StockLevel::query()
            ->where('item_id', $item->id)
            ->orderByDesc('quantity_on_hand')
            ->value('bin_id');

        if ($existing) {
            return (int) $existing;
        }

        throw new \InvalidArgumentException("No putaway bin could be resolved for item {$item->sku}.");
    }
}
