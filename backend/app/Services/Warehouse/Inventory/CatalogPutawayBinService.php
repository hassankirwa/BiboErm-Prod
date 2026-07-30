<?php

namespace App\Services\Warehouse\Inventory;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\MasterData\BinCatalogExcelService;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Resolve GRN putaway dropdown options as physical storage locations:
 * - Aluminium catalog tiers (Premium/Standard/…) → CAGE1–CAGE3 in that section
 * - Accessories → accessory deck bins by door-type section (BIN1–BIN5)
 * - Rubbers / non-catalog aluminium → category deck bins
 *
 * Material identity comes from the receiving warehouse item (PO line).
 * `bins` is the authoritative putaway dropdown; `catalog_slots` is optional
 * metadata only (inventory SKUs with mapped bins — not destinations).
 */
class CatalogPutawayBinService
{
    /** @var array<string, list<array<string, mixed>>> */
    protected array $sectionBinsCache = [];

    /** @var array<string, list<array<string, mixed>>> */
    protected array $deckBinsCache = [];

    /**
     * @param  list<int>  $itemIds
     * @return list<array<string, mixed>>
     */
    public function optionsForItemIds(array $itemIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $itemIds))));
        if ($ids === []) {
            return [];
        }

        $items = Item::query()
            ->whereIn('id', $ids)
            ->with(['aluminiumProfile', 'accessory', 'rubber'])
            ->get()
            ->keyBy('id');

        $results = [];
        foreach ($ids as $id) {
            $item = $items->get($id);
            if (! $item) {
                continue;
            }
            $results[] = $this->optionsForItem($item);
        }

        return $results;
    }

    /**
     * @return array{bins: list<array<string, mixed>>, suggested_bin_id: ?int, section_code: ?string, source: ?string}
     */
    public function putawayBinsForLegend(Item $item): array
    {
        $options = $this->optionsForItem($item, includeCatalogSlots: false);

        return [
            'bins' => $options['bins'] ?? [],
            'suggested_bin_id' => isset($options['suggested_bin_id']) && is_numeric($options['suggested_bin_id'])
                ? (int) $options['suggested_bin_id']
                : null,
            'section_code' => $options['section_code'] ?? null,
            'source' => $options['source'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function optionsForItem(Item $item, bool $includeCatalogSlots = true): array
    {
        // Materials from uploaded catalog workbooks (Premium / Standard / Balustrade /
        // Specialty) — including accessories in those sheets — put away into that
        // tier's CAGE1–3. Do not send them to seed door-type Handles/Hinges BINs.
        $catalog = $this->resolveCatalogSection($item);

        if ($catalog !== null) {
            $bins = $this->binsForSectionCode($catalog['section_code']);
            $suggested = $this->suggestWithin($item, $bins, $catalog['preferred_bin_id'] ?? null);
            $catalogSlots = $includeCatalogSlots ? $this->catalogSlotsForItem($item) : [];

            return [
                'warehouse_item_id' => $item->id,
                'sku' => $item->sku,
                'category' => $item->category?->value ?? $item->category,
                'catalog_tier' => $catalog['catalog_tier'],
                'section_code' => $catalog['section_code'],
                'source' => $catalog['source'],
                'suggested_bin_id' => $suggested,
                'suggested_catalog_item_id' => $includeCatalogSlots
                    ? $this->suggestedCatalogItemId($item, $catalogSlots)
                    : null,
                'bins' => $bins,
                'catalog_slots' => $catalogSlots,
            ];
        }

        // Non-catalog accessories only: door-type accessories deck (when present).
        if ($item->category === ItemCategory::Accessory) {
            $bins = $this->accessorySegmentBins($item);
            $suggested = $this->suggestWithin($item, $bins, $this->extensionDefaultBinId($item));
            $catalogSlots = $includeCatalogSlots ? $this->catalogSlotsForItem($item) : [];

            return [
                'warehouse_item_id' => $item->id,
                'sku' => $item->sku,
                'category' => $item->category?->value ?? $item->category,
                'catalog_tier' => $item->catalog_tier,
                'section_code' => $this->firstSectionCode($bins),
                'source' => 'accessories_deck',
                'suggested_bin_id' => $suggested,
                'suggested_catalog_item_id' => $includeCatalogSlots
                    ? $this->suggestedCatalogItemId($item, $catalogSlots)
                    : null,
                'bins' => $bins,
                'catalog_slots' => $catalogSlots,
            ];
        }

        $fallbackBins = $this->categoryDeckBins($item);
        $suggested = $this->suggestWithin($item, $fallbackBins, null);
        $catalogSlots = $includeCatalogSlots ? $this->catalogSlotsForItem($item) : [];

        return [
            'warehouse_item_id' => $item->id,
            'sku' => $item->sku,
            'category' => $item->category?->value ?? $item->category,
            'catalog_tier' => $item->catalog_tier,
            'section_code' => $this->firstSectionCode($fallbackBins),
            'source' => 'category_deck',
            'suggested_bin_id' => $suggested,
            'suggested_catalog_item_id' => $includeCatalogSlots
                ? $this->suggestedCatalogItemId($item, $catalogSlots)
                : null,
            'bins' => $fallbackBins,
            'catalog_slots' => $catalogSlots,
        ];
    }

    /**
     * Optional metadata: inventory materials in the same category/tier with their
     * mapped physical bin. Not used as GRN putaway destinations — operators choose
     * from `bins` (CAGE/BIN locations) while quantity tracks on the receiving item.
     *
     * @return list<array<string, mixed>>
     */
    protected function catalogSlotsForItem(Item $item): array
    {
        $category = $item->category;
        if (! in_array($category, [
            ItemCategory::Accessory,
            ItemCategory::AluminiumProfile,
            ItemCategory::Rubber,
        ], true)) {
            return [];
        }

        $categoryValue = $category instanceof ItemCategory ? $category->value : (string) $category;

        $query = Item::query()
            ->where('is_active', true)
            ->whereNotNull('catalog_tier')
            ->where('category', $categoryValue)
            ->with(['aluminiumProfile', 'accessory', 'rubber']);

        if ($category === ItemCategory::AluminiumProfile) {
            $tier = $this->resolvedCatalogTier($item);
            if ($tier !== null) {
                $query->where('catalog_tier', $tier);
            }
        }

        $catalogItems = $query
            ->orderBy('catalog_tier')
            ->orderBy('sku')
            ->limit(2000)
            ->get();

        /** @var array<string, ?int> $binCache */
        $binCache = [];
        $slots = [];

        foreach ($catalogItems as $catalogItem) {
            $cacheKey = $this->physicalBinCacheKey($catalogItem);
            if (! array_key_exists($cacheKey, $binCache)) {
                $binCache[$cacheKey] = $this->resolvePhysicalBinId($catalogItem);
            }

            $toBinId = $binCache[$cacheKey];
            if ($toBinId === null) {
                continue;
            }

            $slots[] = [
                'id' => $catalogItem->id,
                'sku' => $catalogItem->sku,
                'name' => $catalogItem->name,
                'category' => $catalogItem->category?->value ?? $catalogItem->category,
                'catalog_tier' => $catalogItem->catalog_tier,
                'to_bin_id' => $toBinId,
                'label' => $this->catalogSlotLabel($catalogItem),
            ];
        }

        return $slots;
    }

    /**
     * Resolve the physical warehouse_bins id for a catalog inventory item
     * without rebuilding catalog_slots (avoids recursion).
     */
    public function resolvePhysicalBinId(Item $catalogItem): ?int
    {
        $preferred = $this->extensionDefaultBinId($catalogItem)
            ?? $this->numericId(is_array($catalogItem->catalog_metadata)
                ? ($catalogItem->catalog_metadata['default_bin_id'] ?? null)
                : null)
            ?? ($this->binCatalogMatch($catalogItem->sku)['bin_id'] ?? null);

        if ($catalogItem->category === ItemCategory::Accessory) {
            $bins = $this->accessorySegmentBins($catalogItem);

            return $this->suggestWithin($catalogItem, $bins, $preferred);
        }

        $catalog = $this->resolveCatalogSection($catalogItem);
        if ($catalog !== null) {
            $bins = $this->binsForSectionCode($catalog['section_code']);

            return $this->suggestWithin(
                $catalogItem,
                $bins,
                $catalog['preferred_bin_id'] ?? $preferred,
            );
        }

        $fallbackBins = $this->categoryDeckBins($catalogItem);

        return $this->suggestWithin($catalogItem, $fallbackBins, $preferred);
    }

    /**
     * @param  list<array<string, mixed>>  $catalogSlots
     */
    protected function suggestedCatalogItemId(Item $item, array $catalogSlots): ?int
    {
        foreach ($catalogSlots as $slot) {
            if ((int) ($slot['id'] ?? 0) === (int) $item->id) {
                return (int) $item->id;
            }
        }

        return null;
    }

    protected function resolvedCatalogTier(Item $item): ?string
    {
        $tier = is_string($item->catalog_tier) ? strtolower(trim($item->catalog_tier)) : '';
        if ($tier !== '') {
            return $tier;
        }

        $resolved = $this->resolveCatalogSection($item);
        $fromSection = $resolved['catalog_tier'] ?? null;

        return is_string($fromSection) && trim($fromSection) !== ''
            ? strtolower(trim($fromSection))
            : null;
    }

    protected function physicalBinCacheKey(Item $catalogItem): string
    {
        $category = $catalogItem->category?->value ?? (string) $catalogItem->category;
        $preferred = $this->extensionDefaultBinId($catalogItem)
            ?? $this->numericId(is_array($catalogItem->catalog_metadata)
                ? ($catalogItem->catalog_metadata['default_bin_id'] ?? null)
                : null);

        $tier = is_string($catalogItem->catalog_tier) ? strtolower(trim($catalogItem->catalog_tier)) : '';
        $doorTypeId = $catalogItem->door_type_id
            ?? $catalogItem->accessory?->door_type_id
            ?? 0;
        $skuKey = $this->normalizeCode((string) $catalogItem->sku);

        // Explicit bin mapping → resolve once per preferred bin.
        // Otherwise key by sku (BinCatalogCode may differ) plus tier/door segment.
        if ($preferred !== null) {
            return $category.'|preferred|'.$preferred;
        }

        return $category.'|sku|'.$skuKey.'|tier|'.$tier.'|door|'.$doorTypeId;
    }

    protected function catalogSlotLabel(Item $catalogItem): string
    {
        $parts = array_filter([
            $catalogItem->name,
            $catalogItem->sku,
        ], fn ($part) => is_string($part) && trim($part) !== '');

        $dimensions = null;
        $profile = $catalogItem->aluminiumProfile;
        if ($profile) {
            $width = $profile->width_mm !== null ? rtrim(rtrim((string) $profile->width_mm, '0'), '.') : null;
            $depth = $profile->depth_mm !== null ? rtrim(rtrim((string) $profile->depth_mm, '0'), '.') : null;
            if ($width !== null && $width !== '' && $depth !== null && $depth !== '') {
                $dimensions = $width.'×'.$depth.'mm';
            } elseif ($width !== null && $width !== '') {
                $dimensions = $width.'mm';
            } elseif ($depth !== null && $depth !== '') {
                $dimensions = $depth.'mm';
            }
        }

        if ($dimensions !== null) {
            $parts[] = $dimensions;
        }

        $tier = is_string($catalogItem->catalog_tier) ? trim($catalogItem->catalog_tier) : '';
        if ($tier !== '') {
            $parts[] = Str::title($tier);
        }

        return implode(' · ', $parts);
    }

    /**
     * Accessory putaway: prefer the item's door-type section bins, then the rest
     * of the accessories deck so operators can choose Handles / Locks / Tracks / etc.
     *
     * @return list<array<string, mixed>>
     */
    protected function accessorySegmentBins(Item $item): array
    {
        $preferredSection = null;
        $doorTypeId = $item->door_type_id
            ?? $item->accessory?->door_type_id
            ?? Accessory::query()->where('item_id', $item->id)->value('door_type_id');

        if ($doorTypeId) {
            $preferredSection = DoorType::query()->whereKey($doorTypeId)->value('section_code');
            if (! is_string($preferredSection) || trim($preferredSection) === '') {
                $preferredSection = null;
            }
        }

        $all = $this->deckBins('accessories', excludeCatalogSections: false);
        if ($preferredSection === null || $all === []) {
            return $all;
        }

        $preferred = [];
        $rest = [];
        foreach ($all as $bin) {
            if (($bin['section_code'] ?? null) === $preferredSection) {
                $preferred[] = $bin;
            } else {
                $rest[] = $bin;
            }
        }

        return array_values(array_merge($preferred, $rest));
    }

    /**
     * @param  list<array<string, mixed>>  $bins
     */
    protected function firstSectionCode(array $bins): ?string
    {
        foreach ($bins as $bin) {
            $code = $bin['section_code'] ?? null;
            if (is_string($code) && $code !== '') {
                return $code;
            }
        }

        return null;
    }

    /**
     * @return array{section_code: string, catalog_tier: ?string, source: string, preferred_bin_id: ?int}|null
     */
    protected function resolveCatalogSection(Item $item): ?array
    {
        $sectionToTier = array_flip(BinCatalogExcelService::FILE_TO_SECTION);
        $catalogSectionCodes = array_values(BinCatalogExcelService::FILE_TO_SECTION);

        $metadata = is_array($item->catalog_metadata) ? $item->catalog_metadata : [];
        $fromMetadata = isset($metadata['bin_section_code']) ? trim((string) $metadata['bin_section_code']) : '';
        if ($fromMetadata !== '' && in_array($fromMetadata, $catalogSectionCodes, true)) {
            return [
                'section_code' => $fromMetadata,
                'catalog_tier' => $sectionToTier[$fromMetadata] ?? $item->catalog_tier,
                'source' => 'catalog_metadata',
                'preferred_bin_id' => $this->numericId($metadata['default_bin_id'] ?? null),
            ];
        }

        $tier = is_string($item->catalog_tier) ? strtolower(trim($item->catalog_tier)) : '';
        if ($tier !== '' && isset(BinCatalogExcelService::FILE_TO_SECTION[$tier])) {
            return [
                'section_code' => BinCatalogExcelService::FILE_TO_SECTION[$tier],
                'catalog_tier' => $tier,
                'source' => 'catalog_tier',
                'preferred_bin_id' => $this->numericId($metadata['default_bin_id'] ?? null)
                    ?? $this->extensionDefaultBinId($item),
            ];
        }

        $fromCode = $this->binCatalogMatch($item->sku);
        if ($fromCode !== null) {
            $sectionCode = $fromCode['section_code'];
            if (in_array($sectionCode, $catalogSectionCodes, true)) {
                return [
                    'section_code' => $sectionCode,
                    'catalog_tier' => $sectionToTier[$sectionCode] ?? $item->catalog_tier,
                    'source' => 'bin_catalog_code',
                    'preferred_bin_id' => $fromCode['bin_id'],
                ];
            }
        }

        $defaultBinId = $this->extensionDefaultBinId($item)
            ?? $this->numericId($metadata['default_bin_id'] ?? null);
        if ($defaultBinId !== null) {
            $bin = Bin::query()->with('section')->whereKey($defaultBinId)->first();
            $sectionCode = $bin?->section?->code;
            if (is_string($sectionCode) && in_array($sectionCode, $catalogSectionCodes, true)) {
                return [
                    'section_code' => $sectionCode,
                    'catalog_tier' => $sectionToTier[$sectionCode] ?? $item->catalog_tier,
                    'source' => 'default_bin',
                    'preferred_bin_id' => $defaultBinId,
                ];
            }
        }

        return null;
    }

    /**
     * @return array{bin_id: int, section_code: string}|null
     */
    protected function binCatalogMatch(?string $sku): ?array
    {
        $normalized = $this->normalizeCode((string) $sku);
        if ($normalized === '') {
            return null;
        }

        $row = BinCatalogCode::query()
            ->with('bin.section')
            ->where('normalized_code', $normalized)
            ->first();

        if (! $row || ! $row->bin_id || ! $row->bin?->section?->code) {
            return null;
        }

        return [
            'bin_id' => (int) $row->bin_id,
            'section_code' => (string) $row->bin->section->code,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function binsForSectionCode(string $sectionCode): array
    {
        if (isset($this->sectionBinsCache[$sectionCode])) {
            return $this->sectionBinsCache[$sectionCode];
        }

        return $this->sectionBinsCache[$sectionCode] = Bin::query()
            ->with(['section.deck'])
            ->where('is_active', true)
            ->whereHas('section', fn ($q) => $q->where('code', $sectionCode)->where('is_active', true))
            ->orderByRaw("CASE WHEN code = 'CAGE1' THEN 0 WHEN code LIKE 'CAGE%' THEN 1 ELSE 2 END")
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get()
            ->map(fn (Bin $bin) => $this->binPayload($bin))
            ->values()
            ->all();
    }

    /**
     * Non-catalog items: bins on the category deck (accessories / rubbers / aluminium).
     *
     * @return list<array<string, mixed>>
     */
    protected function categoryDeckBins(Item $item): array
    {
        $deckSlug = match ($item->category) {
            ItemCategory::AluminiumProfile => 'aluminium',
            ItemCategory::Accessory => 'accessories',
            ItemCategory::Rubber => 'rubbers',
            default => null,
        };

        if ($deckSlug === null) {
            return [];
        }

        return $this->deckBins(
            $deckSlug,
            excludeCatalogSections: $deckSlug === 'aluminium',
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function deckBins(string $deckSlug, bool $excludeCatalogSections = false): array
    {
        $cacheKey = $deckSlug.'|'.($excludeCatalogSections ? '1' : '0');
        if (isset($this->deckBinsCache[$cacheKey])) {
            return $this->deckBinsCache[$cacheKey];
        }

        $catalogSectionCodes = array_values(BinCatalogExcelService::FILE_TO_SECTION);

        $query = Bin::query()
            ->with(['section.deck'])
            ->where('is_active', true)
            ->whereHas('section', function ($q) use ($deckSlug) {
                $q->where('is_active', true)
                    ->whereHas('deck', fn ($deck) => $deck->where('slug', $deckSlug)->where('is_active', true));
            });

        if ($excludeCatalogSections) {
            $query->whereHas('section', fn ($q) => $q->whereNotIn('code', $catalogSectionCodes));
        }

        return $this->deckBinsCache[$cacheKey] = $query
            ->orderBy('section_id')
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get()
            ->map(fn (Bin $bin) => $this->binPayload($bin))
            ->values()
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $bins
     */
    protected function suggestWithin(Item $item, array $bins, ?int $preferredBinId): ?int
    {
        if ($bins === []) {
            return null;
        }

        /** @var Collection<int, int> $ids */
        $ids = collect($bins)->pluck('id')->map(fn ($id) => (int) $id);

        $candidates = array_filter([
            $preferredBinId,
            $this->extensionDefaultBinId($item),
            $this->numericId(is_array($item->catalog_metadata) ? ($item->catalog_metadata['default_bin_id'] ?? null) : null),
            $this->binCatalogMatch($item->sku)['bin_id'] ?? null,
        ], fn ($id) => is_int($id) && $id > 0);

        foreach ($candidates as $candidate) {
            if ($ids->contains($candidate)) {
                return $candidate;
            }
        }

        foreach ($bins as $bin) {
            if (($bin['code'] ?? null) === 'CAGE1') {
                return (int) $bin['id'];
            }
        }

        return (int) $bins[0]['id'];
    }

    /**
     * @return array<string, mixed>
     */
    protected function binPayload(Bin $bin): array
    {
        $sectionCode = $bin->section?->code;
        $sectionName = $bin->section?->name;
        $deckSlug = $bin->section?->deck?->slug?->value ?? $bin->section?->deck?->slug;
        $deckName = $bin->section?->deck?->name;
        $slotCode = is_string($deckSlug) && $deckSlug === 'aluminium' && str_starts_with(strtoupper((string) $bin->code), 'BIN')
            ? preg_replace('/^BIN/i', 'CAGE', (string) $bin->code)
            : $bin->code;
        $tag = $this->humanSlotTag((string) $slotCode, is_string($deckSlug) ? $deckSlug : null);
        $sectionShort = $this->friendlySectionLabel($sectionCode, $sectionName);
        // Lead with Cage/Bin tag so long section names do not hide the slot in truncated selects.
        $label = $tag;
        if ($sectionShort !== null) {
            $label .= ' · '.$sectionShort;
        } elseif ($deckName) {
            $label .= ' · '.$deckName;
        }

        return [
            'id' => $bin->id,
            'code' => $bin->code,
            'name' => $bin->name,
            'section_code' => $sectionCode,
            'section_name' => $sectionName,
            'deck_slug' => $deckSlug,
            'deck_name' => $deckName,
            'tag' => $tag,
            'label' => $label,
        ];
    }

    protected function humanSlotTag(string $slotCode, ?string $deckSlug): string
    {
        $upper = strtoupper(trim($slotCode));
        if (preg_match('/^CAGE\s*(\d+)$/i', $upper, $m) === 1) {
            return 'Cage '.$m[1];
        }
        if (preg_match('/^BIN\s*(\d+)$/i', $upper, $m) === 1) {
            return ($deckSlug === 'aluminium' ? 'Cage ' : 'Bin ').$m[1];
        }

        return $slotCode !== '' ? $slotCode : 'Location';
    }

    protected function friendlySectionLabel(?string $sectionCode, ?string $sectionName): ?string
    {
        $known = [
            'SEC-ALU-PREMIUM' => 'Premium',
            'SEC-ALU-STANDARD' => 'Standard',
            'SEC-ALU-BALUSTRADE' => 'Balustrade',
            'SEC-ALU-SPECIALTY' => 'Specialty',
        ];

        if ($sectionCode !== null && isset($known[$sectionCode])) {
            return $known[$sectionCode];
        }

        if (is_string($sectionName) && trim($sectionName) !== '') {
            return trim($sectionName);
        }

        if (is_string($sectionCode) && trim($sectionCode) !== '') {
            return trim($sectionCode);
        }

        return null;
    }

    protected function extensionDefaultBinId(Item $item): ?int
    {
        if ($item->category === ItemCategory::AluminiumProfile) {
            $binId = $item->aluminiumProfile?->default_bin_id
                ?? AluminiumProfile::query()->where('item_id', $item->id)->value('default_bin_id');

            return $binId ? (int) $binId : null;
        }

        if ($item->category === ItemCategory::Accessory) {
            $binId = $item->accessory?->default_bin_id
                ?? Accessory::query()->where('item_id', $item->id)->value('default_bin_id');

            return $binId ? (int) $binId : null;
        }

        return null;
    }

    protected function numericId(mixed $value): ?int
    {
        if (is_int($value) && $value > 0) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
            return (int) $value;
        }

        return null;
    }

    protected function normalizeCode(string $code): string
    {
        return Str::upper(preg_replace('/[\s_\-]+/', '', trim($code)) ?? trim($code));
    }
}
