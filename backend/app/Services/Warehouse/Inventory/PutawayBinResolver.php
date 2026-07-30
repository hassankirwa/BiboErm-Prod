<?php

namespace App\Services\Warehouse\Inventory;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Rubber;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\MasterData\BinCatalogExcelService;
use Illuminate\Support\Str;

class PutawayBinResolver
{
    public function resolve(int $warehouseItemId, ?int $toBinId = null): int
    {
        $suggested = $this->suggest($warehouseItemId, $toBinId);

        if ($suggested !== null) {
            return $suggested;
        }

        $item = Item::query()->findOrFail($warehouseItemId);

        throw new \InvalidArgumentException("No putaway bin could be resolved for item {$item->sku}.");
    }

    /**
     * Resolve a putaway bin without throwing when none is known.
     */
    public function suggest(int $warehouseItemId, ?int $toBinId = null): ?int
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

        if ($item->category === ItemCategory::AluminiumProfile) {
            $binId = AluminiumProfile::query()->where('item_id', $item->id)->value('default_bin_id');
            if ($binId) {
                return (int) $binId;
            }
        }

        $metadataBinId = $this->binIdFromCatalogMetadata($item);
        if ($metadataBinId !== null) {
            return $metadataBinId;
        }

        $catalogCodeBinId = $this->binIdFromBinCatalogCode($item->sku);
        if ($catalogCodeBinId !== null) {
            return $catalogCodeBinId;
        }

        $tierBinId = $this->binIdFromCatalogTier($item->catalog_tier);
        if ($tierBinId !== null) {
            return $tierBinId;
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

        return $existing ? (int) $existing : null;
    }

    protected function binIdFromCatalogMetadata(Item $item): ?int
    {
        $metadata = is_array($item->catalog_metadata) ? $item->catalog_metadata : [];
        $binId = $metadata['default_bin_id'] ?? null;

        if (! is_numeric($binId)) {
            return null;
        }

        $exists = Bin::query()->whereKey((int) $binId)->where('is_active', true)->exists();

        return $exists ? (int) $binId : null;
    }

    protected function binIdFromBinCatalogCode(?string $sku): ?int
    {
        $normalized = $this->normalizeCode((string) $sku);
        if ($normalized === '') {
            return null;
        }

        $binId = BinCatalogCode::query()
            ->where('normalized_code', $normalized)
            ->value('bin_id');

        return $binId ? (int) $binId : null;
    }

    protected function binIdFromCatalogTier(?string $catalogTier): ?int
    {
        if ($catalogTier === null || $catalogTier === '') {
            return null;
        }

        $sectionCode = BinCatalogExcelService::FILE_TO_SECTION[$catalogTier] ?? null;
        if ($sectionCode === null) {
            return null;
        }

        $binId = Bin::query()
            ->where('is_active', true)
            ->whereHas('section', fn ($q) => $q->where('code', $sectionCode)->where('is_active', true))
            ->orderByRaw("CASE WHEN code = 'CAGE1' THEN 0 ELSE 1 END")
            ->orderBy('sort_order')
            ->value('id');

        return $binId ? (int) $binId : null;
    }

    protected function normalizeCode(string $code): string
    {
        return Str::upper(preg_replace('/[\s_\-]+/', '', trim($code)) ?? trim($code));
    }
}
