<?php

namespace App\Services\Warehouse\StockTake;

use App\Enums\Warehouse\ItemCategory;
use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockMovement;
use App\Services\Warehouse\Inventory\PutawayBinResolver;
use App\Services\Warehouse\Movements\StockMovementService;
use App\Support\Warehouse\DeckAccess;
use InvalidArgumentException;

class StockTakeService
{
    public function __construct(
        protected StockMovementService $movements,
        protected PutawayBinResolver $putawayBins,
    ) {}

    /**
     * Snapshot of system stock for manual count, grouped by item category.
     *
     * When a category is given, every active catalog item in that category is
     * included — existing bin stock rows plus zero-qty lines for items that
     * only have a resolvable default bin (so nothing is skipped in the count).
     *
     * @param  array{category?: string|null, deck?: string|null, section_id?: int|null, bin_id?: int|null}  $filters
     * @return array{snapshot_at: string, filters: array<string, mixed>, lines: list<array<string, mixed>>, categories: list<array<string, mixed>>, line_count: int}
     */
    public function snapshot(User $user, array $filters = []): array
    {
        $category = $this->normalizeCategory($filters['category'] ?? null);
        $lines = $category !== null
            ? $this->catalogCategoryLines($user, $category, $filters)
            : $this->stockLevelLines($user, $filters);

        $grouped = collect($lines)
            ->groupBy(fn (array $line) => $line['category'] ?? 'other')
            ->map(fn ($group, $key) => [
                'category' => $key,
                'label' => $this->categoryLabel((string) $key),
                'line_count' => $group->count(),
                'lines' => $group->values()->all(),
            ])
            ->sortBy(fn (array $group) => $this->categorySortKey($group['category']))
            ->values()
            ->all();

        return [
            'snapshot_at' => now()->toIso8601String(),
            'filters' => array_filter($filters, fn ($value) => $value !== null && $value !== ''),
            'line_count' => count($lines),
            'lines' => $lines,
            'categories' => $grouped,
        ];
    }

    /**
     * @param  array<int, array{item_id: int, bin_id: int, counted_qty: string|float|int, variance_reason?: string|null}>  $counts
     * @return array{snapshot_at: string, lines: list<array<string, mixed>>, summary: array<string, int|float|string>}
     */
    public function variance(array $counts): array
    {
        $lines = [];

        foreach ($counts as $count) {
            $itemId = (int) $count['item_id'];
            $binId = (int) $count['bin_id'];
            $countedQty = $this->formatQty($count['counted_qty']);
            $reason = isset($count['variance_reason']) ? trim((string) $count['variance_reason']) : '';

            $level = StockLevel::query()
                ->with(['item', 'bin.section.deck'])
                ->where('item_id', $itemId)
                ->where('bin_id', $binId)
                ->first();

            $item = $level?->item ?? Item::query()->find($itemId);
            $bin = $level?->bin ?? Bin::query()->find($binId);

            $systemQty = $level ? (string) $level->quantity_on_hand : '0.000';
            $variance = bcsub($countedQty, $systemQty, 3);
            $hasVariance = bccomp($variance, '0', 3) !== 0;
            $category = $item?->category instanceof ItemCategory
                ? $item->category->value
                : ($item?->category ?? null);

            $lines[] = [
                'item_id' => $itemId,
                'bin_id' => $binId,
                'sku' => $item?->sku,
                'item_name' => $item?->name,
                'category' => $category,
                'bin_code' => $bin?->code,
                'system_qty' => $systemQty,
                'counted_qty' => $countedQty,
                'variance' => $variance,
                'direction' => bccomp($variance, '0', 3) === 1 ? 'increase' : (bccomp($variance, '0', 3) === -1 ? 'decrease' : 'none'),
                'has_variance' => $hasVariance,
                'variance_reason' => $reason !== '' ? $reason : null,
                'quantity_reserved' => $level ? (string) $level->quantity_reserved : '0.000',
            ];
        }

        $varianceLines = collect($lines)->where('has_variance', true);

        return [
            'snapshot_at' => now()->toIso8601String(),
            'summary' => [
                'lines_submitted' => count($lines),
                'lines_with_variance' => $varianceLines->count(),
                'total_abs_variance' => $varianceLines->reduce(
                    fn (string $carry, array $line) => bcadd($carry, ltrim($line['variance'], '-'), 3),
                    '0.000'
                ),
            ],
            'lines' => $lines,
        ];
    }

    /**
     * Apply approved stock-take variances as a single adjustment movement.
     * Every variance line must include a non-empty variance_reason (audit log).
     *
     * @param  array<int, array{item_id: int, bin_id: int, counted_qty: string|float|int, variance_reason?: string|null}>  $counts
     */
    public function apply(User $user, array $counts, ?string $notes = null): StockMovement
    {
        $report = $this->variance($counts);

        $adjustLines = [];
        $reasonLines = [];

        foreach ($report['lines'] as $line) {
            if (! $line['has_variance']) {
                continue;
            }

            $reason = trim((string) ($line['variance_reason'] ?? ''));
            if ($reason === '') {
                $sku = $line['sku'] ?? ('item #'.$line['item_id']);
                throw new InvalidArgumentException(
                    "Variance reason is required for {$sku} (bin {$line['bin_code']})."
                );
            }

            $absQty = ltrim($line['variance'], '-');
            $adjustLines[] = [
                'item_id' => $line['item_id'],
                'bin_id' => $line['bin_id'],
                'quantity' => $absQty,
                'direction' => $line['direction'],
            ];

            $sku = $line['sku'] ?? ('#'.$line['item_id']);
            $bin = $line['bin_code'] ?? ('bin #'.$line['bin_id']);
            $reasonLines[] = "{$sku} @ {$bin}: {$line['variance']} — {$reason}";
        }

        if ($adjustLines === []) {
            throw new InvalidArgumentException('No variances to apply — counted quantities match system stock.');
        }

        $header = 'Stock-take reconciliation ('.$report['summary']['lines_with_variance'].' variance line(s)).';
        $movementNotes = trim(implode("\n", array_filter([
            $notes ? trim($notes) : null,
            $header,
            ...$reasonLines,
        ])));

        return $this->movements->adjust(
            performer: $user,
            lines: $adjustLines,
            notes: $movementNotes !== '' ? $movementNotes : null,
            respectAvailableOnDecrement: false,
        );
    }

    /**
     * @param  array{deck?: string|null, section_id?: int|null, bin_id?: int|null}  $filters
     * @return list<array<string, mixed>>
     */
    protected function stockLevelLines(User $user, array $filters): array
    {
        return $this->scopedLevelsQuery($user, $filters)
            ->with(['item', 'bin.section.deck.warehouse'])
            ->orderBy('bin_id')
            ->orderBy('item_id')
            ->get()
            ->map(fn (StockLevel $level) => $this->snapshotLine($level))
            ->values()
            ->all();
    }

    /**
     * All active items in a category: each existing stock row, plus a zero line
     * for items that have a default bin but no stock_levels yet.
     *
     * @param  array{deck?: string|null, section_id?: int|null, bin_id?: int|null}  $filters
     * @return list<array<string, mixed>>
     */
    protected function catalogCategoryLines(User $user, string $category, array $filters): array
    {
        $allowedDecks = DeckAccess::allowedDeckSlugs($user);
        $restrictDecks = $allowedDecks !== [] && ! DeckAccess::canViewAll($user);

        $items = Item::query()
            ->where('is_active', true)
            ->where('category', $category)
            ->with(['stockLevels.bin.section.deck'])
            ->orderBy('sku')
            ->get();

        $lines = [];
        $seen = [];

        foreach ($items as $item) {
            $levels = $item->stockLevels;

            if ($filters['bin_id'] ?? null) {
                $levels = $levels->where('bin_id', (int) $filters['bin_id']);
            }

            if ($filters['section_id'] ?? null) {
                $levels = $levels->filter(
                    fn (StockLevel $level) => (int) $level->bin?->section_id === (int) $filters['section_id']
                );
            }

            if ($filters['deck'] ?? null) {
                $deck = $filters['deck'];
                $levels = $levels->filter(function (StockLevel $level) use ($deck) {
                    $slug = $level->bin?->section?->deck?->slug;

                    return ($slug?->value ?? $slug) === $deck;
                });
            }

            if ($restrictDecks) {
                $levels = $levels->filter(function (StockLevel $level) use ($allowedDecks) {
                    $slug = $level->bin?->section?->deck?->slug;
                    $value = $slug?->value ?? $slug;

                    return $value !== null && in_array($value, $allowedDecks, true);
                });
            }

            foreach ($levels as $level) {
                $key = $level->item_id.'-'.$level->bin_id;
                $seen[$key] = true;
                $lines[] = $this->snapshotLine($level);
            }

            // Include catalog items with no stock row yet (manual count can create stock).
            if ($levels->isEmpty() && ! ($filters['bin_id'] ?? null) && ! ($filters['section_id'] ?? null)) {
                $suggestedBinId = $this->putawayBins->suggest($item->id);
                if ($suggestedBinId === null) {
                    continue;
                }

                $bin = Bin::query()->with('section.deck')->find($suggestedBinId);
                if (! $bin) {
                    continue;
                }

                if ($restrictDecks) {
                    $slug = $bin->section?->deck?->slug;
                    $value = $slug?->value ?? $slug;
                    if ($value === null || ! in_array($value, $allowedDecks, true)) {
                        continue;
                    }
                }

                if (($filters['deck'] ?? null) !== null) {
                    $slug = $bin->section?->deck?->slug;
                    $value = $slug?->value ?? $slug;
                    if ($value !== $filters['deck']) {
                        continue;
                    }
                }

                $key = $item->id.'-'.$bin->id;
                if (isset($seen[$key])) {
                    continue;
                }

                $lines[] = $this->syntheticSnapshotLine($item, $bin);
            }
        }

        return $lines;
    }

    /**
     * @param  array{deck?: string|null, section_id?: int|null, bin_id?: int|null, category?: string|null}  $filters
     */
    protected function scopedLevelsQuery(User $user, array $filters)
    {
        $allowedDecks = DeckAccess::allowedDeckSlugs($user);
        $category = $this->normalizeCategory($filters['category'] ?? null);

        return StockLevel::query()
            ->when($category, fn ($q, $cat) => $q->whereHas('item', fn ($iq) => $iq->where('category', $cat)))
            ->when($filters['deck'] ?? null, fn ($q, $deck) => $q->whereHas(
                'bin.section.deck',
                fn ($dq) => $dq->where('slug', $deck)
            ))
            ->when($filters['section_id'] ?? null, fn ($q, $sectionId) => $q->whereHas(
                'bin',
                fn ($bq) => $bq->where('section_id', $sectionId)
            ))
            ->when($filters['bin_id'] ?? null, fn ($q, $binId) => $q->where('bin_id', $binId))
            ->when($allowedDecks !== [] && ! DeckAccess::canViewAll($user), function ($q) use ($allowedDecks) {
                $q->whereHas('bin.section.deck', fn ($dq) => $dq->whereIn('slug', $allowedDecks));
            });
    }

    /**
     * @return array<string, mixed>
     */
    protected function snapshotLine(StockLevel $level): array
    {
        $level->loadMissing(['item', 'bin.section.deck']);
        $category = $level->item?->category instanceof ItemCategory
            ? $level->item->category->value
            : ($level->item?->category ?? null);

        return [
            'stock_level_id' => $level->id,
            'item_id' => $level->item_id,
            'bin_id' => $level->bin_id,
            'sku' => $level->item?->sku,
            'item_name' => $level->item?->name,
            'category' => $category,
            'unit_of_measure' => $level->item?->unit_of_measure,
            'bin_code' => $level->bin?->code,
            'bin_name' => $level->bin?->name,
            'section_code' => $level->bin?->section?->code,
            'deck_slug' => $level->bin?->section?->deck?->slug?->value ?? $level->bin?->section?->deck?->slug,
            'quantity_on_hand' => (string) $level->quantity_on_hand,
            'quantity_reserved' => (string) $level->quantity_reserved,
            'quantity_available' => $level->availableQuantity(),
            'is_synthetic' => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function syntheticSnapshotLine(Item $item, Bin $bin): array
    {
        $category = $item->category instanceof ItemCategory
            ? $item->category->value
            : ($item->category ?? null);

        return [
            'stock_level_id' => null,
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'sku' => $item->sku,
            'item_name' => $item->name,
            'category' => $category,
            'unit_of_measure' => $item->unit_of_measure,
            'bin_code' => $bin->code,
            'bin_name' => $bin->name,
            'section_code' => $bin->section?->code,
            'deck_slug' => $bin->section?->deck?->slug?->value ?? $bin->section?->deck?->slug,
            'quantity_on_hand' => '0.000',
            'quantity_reserved' => '0.000',
            'quantity_available' => '0.000',
            'is_synthetic' => true,
        ];
    }

    protected function normalizeCategory(mixed $category): ?string
    {
        if ($category === null || $category === '' || $category === 'all') {
            return null;
        }

        $value = (string) $category;
        ItemCategory::from($value);

        return $value;
    }

    protected function categoryLabel(string $category): string
    {
        return match ($category) {
            ItemCategory::AluminiumProfile->value => 'Aluminium Profiles',
            ItemCategory::Accessory->value => 'Accessories',
            ItemCategory::Rubber->value => 'Rubbers & Gaskets',
            default => ucwords(str_replace('_', ' ', $category)),
        };
    }

    protected function categorySortKey(string $category): int
    {
        return match ($category) {
            ItemCategory::AluminiumProfile->value => 1,
            ItemCategory::Accessory->value => 2,
            ItemCategory::Rubber->value => 3,
            default => 99,
        };
    }

    protected function formatQty(string|float|int $qty): string
    {
        return bcadd((string) $qty, '0', 3);
    }
}
