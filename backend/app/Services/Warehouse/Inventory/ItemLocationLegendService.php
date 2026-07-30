<?php

namespace App\Services\Warehouse\Inventory;

use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use Illuminate\Support\Collection;

/**
 * Build a per-bin / per-cage stock legend for a warehouse item.
 *
 * Merges physical putaway bins for the item's section (CAGE1–3, accessory BINs)
 * with actual stock_levels, so mapped cages appear even when qty is 0.
 */
class ItemLocationLegendService
{
    public function __construct(
        protected CatalogPutawayBinService $putawayBins,
    ) {}

    /**
     * Build legends for many items without the per-item catalog_slots scan.
     *
     * @param  list<int>  $itemIds
     * @return array<int, array{data: list<array<string, mixed>>, meta: array<string, mixed>}>
     */
    public function forItemIds(array $itemIds): array
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
            $results[$id] = $this->forItem($item);
        }

        return $results;
    }

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function forItem(Item|int $item): array
    {
        $model = $item instanceof Item
            ? $item
            : Item::query()->with(['aluminiumProfile', 'accessory', 'rubber'])->findOrFail($item);

        if (! $model->relationLoaded('aluminiumProfile')) {
            $model->load(['aluminiumProfile', 'accessory', 'rubber']);
        }

        $putaway = $this->putawayBins->putawayBinsForLegend($model);
        /** @var list<array<string, mixed>> $sectionBins */
        $sectionBins = $putaway['bins'] ?? [];
        $suggestedBinId = $putaway['suggested_bin_id'] ?? null;

        $levels = StockLevel::query()
            ->where('item_id', $model->id)
            ->with(['bin.section.deck'])
            ->get()
            ->keyBy('bin_id');

        $rowsByBinId = [];

        foreach ($sectionBins as $bin) {
            $binId = (int) ($bin['id'] ?? 0);
            if ($binId <= 0) {
                continue;
            }

            $level = $levels->get($binId);
            $rowsByBinId[$binId] = $this->serializeLocationRow(
                binId: $binId,
                binCode: (string) ($bin['code'] ?? ''),
                binName: $bin['name'] ?? null,
                sectionCode: $bin['section_code'] ?? null,
                sectionName: $bin['section_name'] ?? null,
                deckSlug: $bin['deck_slug'] ?? null,
                deckName: $bin['deck_name'] ?? null,
                label: $bin['label'] ?? null,
                level: $level,
                isDefault: $suggestedBinId !== null && $binId === $suggestedBinId,
                isMappedSection: true,
            );
        }

        foreach ($levels as $binId => $level) {
            $binId = (int) $binId;
            if (isset($rowsByBinId[$binId])) {
                continue;
            }

            $bin = $level->bin;
            $rowsByBinId[$binId] = $this->serializeLocationRow(
                binId: $binId,
                binCode: (string) ($bin?->code ?? ''),
                binName: $bin?->name,
                sectionCode: $bin?->section?->code,
                sectionName: $bin?->section?->name,
                deckSlug: $bin?->section?->deck?->slug?->value ?? $bin?->section?->deck?->slug,
                deckName: $bin?->section?->deck?->name,
                label: null,
                level: $level,
                isDefault: $suggestedBinId !== null && $binId === $suggestedBinId,
                isMappedSection: false,
            );
        }

        // No stock and no section bins — still surface the suggested/default cage at 0.
        if ($rowsByBinId === [] && $suggestedBinId !== null) {
            $bin = Bin::query()->with(['section.deck'])->find($suggestedBinId);
            if ($bin) {
                $rowsByBinId[$bin->id] = $this->serializeLocationRow(
                    binId: $bin->id,
                    binCode: (string) $bin->code,
                    binName: $bin->name,
                    sectionCode: $bin->section?->code,
                    sectionName: $bin->section?->name,
                    deckSlug: $bin->section?->deck?->slug?->value ?? $bin->section?->deck?->slug,
                    deckName: $bin->section?->deck?->name,
                    label: null,
                    level: null,
                    isDefault: true,
                    isMappedSection: true,
                );
            }
        }

        $rows = $this->sortRows(collect($rowsByBinId)->values());
        $onHandTotal = 0.0;
        $reservedTotal = 0.0;
        foreach ($rows as $row) {
            $onHandTotal += (float) $row['quantity_on_hand'];
            $reservedTotal += (float) $row['quantity_reserved'];
        }

        return [
            'data' => $rows,
            'meta' => [
                'item_id' => $model->id,
                'sku' => $model->sku,
                'category' => $model->category?->value ?? $model->category,
                'catalog_tier' => $model->catalog_tier,
                'section_code' => $putaway['section_code'] ?? ($rows[0]['section_code'] ?? null),
                'source' => $putaway['source'] ?? null,
                'suggested_bin_id' => $suggestedBinId,
                'locations_count' => count($rows),
                'quantity_on_hand' => number_format($onHandTotal, 3, '.', ''),
                'quantity_reserved' => number_format($reservedTotal, 3, '.', ''),
            ],
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    protected function sortRows(Collection $rows): array
    {
        return $rows
            ->sortBy([
                fn (array $row) => $row['is_mapped_section'] ? 0 : 1,
                fn (array $row) => (string) ($row['section_code'] ?? ''),
                fn (array $row) => match (true) {
                    strtoupper((string) ($row['bin_code'] ?? '')) === 'CAGE1' => 0,
                    str_starts_with(strtoupper((string) ($row['bin_code'] ?? '')), 'CAGE') => 1,
                    default => 2,
                },
                fn (array $row) => (string) ($row['bin_code'] ?? ''),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializeLocationRow(
        int $binId,
        string $binCode,
        mixed $binName,
        mixed $sectionCode,
        mixed $sectionName,
        mixed $deckSlug,
        mixed $deckName,
        mixed $label,
        ?StockLevel $level,
        bool $isDefault,
        bool $isMappedSection,
    ): array {
        $onHand = number_format((float) ($level?->quantity_on_hand ?? 0), 3, '.', '');
        $reserved = number_format((float) ($level?->quantity_reserved ?? 0), 3, '.', '');
        $available = $level
            ? number_format((float) $level->availableQuantity(), 3, '.', '')
            : number_format(0, 3, '.', '');

        $displayCode = is_string($deckSlug) && $deckSlug === 'aluminium' && str_starts_with(strtoupper($binCode), 'BIN')
            ? (string) preg_replace('/^BIN/i', 'CAGE', $binCode)
            : $binCode;

        $resolvedLabel = is_string($label) && $label !== ''
            ? $label
            : trim(implode(' / ', array_filter([
                is_string($deckName) ? $deckName : null,
                is_string($sectionCode) ? $sectionCode : null,
                $displayCode !== '' ? $displayCode : null,
            ])));

        return [
            'stock_level_id' => $level?->id,
            'bin_id' => $binId,
            'bin_code' => $binCode,
            'display_bin_code' => $displayCode,
            'bin_name' => $binName,
            'section_code' => $sectionCode,
            'section_name' => $sectionName,
            'deck_slug' => $deckSlug,
            'deck_name' => $deckName,
            'label' => $resolvedLabel,
            'quantity_on_hand' => $onHand,
            'quantity_reserved' => $reserved,
            'quantity_available' => $available,
            'is_default' => $isDefault,
            'is_mapped_section' => $isMappedSection,
            'has_stock_row' => $level !== null,
        ];
    }
}
