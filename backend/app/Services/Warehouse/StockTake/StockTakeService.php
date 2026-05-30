<?php

namespace App\Services\Warehouse\StockTake;

use App\Models\User;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockMovement;
use App\Services\Warehouse\Movements\StockMovementService;
use App\Support\Warehouse\DeckAccess;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class StockTakeService
{
    public function __construct(
        protected StockMovementService $movements,
    ) {}

    /**
     * @param  array{deck?: string|null, section_id?: int|null, bin_id?: int|null}  $filters
     * @return array{snapshot_at: string, filters: array<string, mixed>, lines: list<array<string, mixed>>, line_count: int}
     */
    public function snapshot(User $user, array $filters = []): array
    {
        $levels = $this->scopedLevelsQuery($user, $filters)
            ->with(['item', 'bin.section.deck.warehouse'])
            ->orderBy('bin_id')
            ->orderBy('item_id')
            ->get();

        return [
            'snapshot_at' => now()->toIso8601String(),
            'filters' => array_filter($filters, fn ($value) => $value !== null && $value !== ''),
            'line_count' => $levels->count(),
            'lines' => $levels->map(fn (StockLevel $level) => $this->snapshotLine($level))->values()->all(),
        ];
    }

    /**
     * @param  array<int, array{item_id: int, bin_id: int, counted_qty: string|float|int}>  $counts
     * @return array{snapshot_at: string, lines: list<array<string, mixed>>, summary: array<string, int|float|string>}
     */
    public function variance(array $counts): array
    {
        $lines = [];

        foreach ($counts as $count) {
            $itemId = (int) $count['item_id'];
            $binId = (int) $count['bin_id'];
            $countedQty = $this->formatQty($count['counted_qty']);

            $level = StockLevel::query()
                ->with(['item', 'bin.section.deck'])
                ->where('item_id', $itemId)
                ->where('bin_id', $binId)
                ->first();

            $systemQty = $level ? (string) $level->quantity_on_hand : '0.000';
            $variance = bcsub($countedQty, $systemQty, 3);
            $hasVariance = bccomp($variance, '0', 3) !== 0;

            $lines[] = [
                'item_id' => $itemId,
                'bin_id' => $binId,
                'sku' => $level?->item?->sku,
                'item_name' => $level?->item?->name,
                'bin_code' => $level?->bin?->code,
                'system_qty' => $systemQty,
                'counted_qty' => $countedQty,
                'variance' => $variance,
                'direction' => bccomp($variance, '0', 3) === 1 ? 'increase' : (bccomp($variance, '0', 3) === -1 ? 'decrease' : 'none'),
                'has_variance' => $hasVariance,
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
     *
     * @param  array<int, array{item_id: int, bin_id: int, counted_qty: string|float|int}>  $counts
     */
    public function apply(User $user, array $counts, ?string $notes = null): StockMovement
    {
        $report = $this->variance($counts);

        $adjustLines = collect($report['lines'])
            ->filter(fn (array $line) => $line['has_variance'])
            ->map(function (array $line) {
                $absQty = ltrim($line['variance'], '-');

                return [
                    'item_id' => $line['item_id'],
                    'bin_id' => $line['bin_id'],
                    'quantity' => $absQty,
                    'direction' => $line['direction'],
                ];
            })
            ->values()
            ->all();

        if ($adjustLines === []) {
            throw new InvalidArgumentException('No variances to apply — counted quantities match system stock.');
        }

        $movementNotes = trim(($notes ?? '').' Stock-take adjustment ('.$report['summary']['lines_with_variance'].' line(s).');

        return $this->movements->adjust(
            performer: $user,
            lines: $adjustLines,
            notes: $movementNotes !== '' ? $movementNotes : null,
            respectAvailableOnDecrement: false,
        );
    }

    /**
     * @param  array{deck?: string|null, section_id?: int|null, bin_id?: int|null}  $filters
     */
    protected function scopedLevelsQuery(User $user, array $filters)
    {
        $allowedDecks = DeckAccess::allowedDeckSlugs($user);

        return StockLevel::query()
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

        return [
            'stock_level_id' => $level->id,
            'item_id' => $level->item_id,
            'bin_id' => $level->bin_id,
            'sku' => $level->item?->sku,
            'item_name' => $level->item?->name,
            'unit_of_measure' => $level->item?->unit_of_measure,
            'bin_code' => $level->bin?->code,
            'bin_name' => $level->bin?->name,
            'section_code' => $level->bin?->section?->code,
            'deck_slug' => $level->bin?->section?->deck?->slug?->value ?? $level->bin?->section?->deck?->slug,
            'quantity_on_hand' => (string) $level->quantity_on_hand,
            'quantity_reserved' => (string) $level->quantity_reserved,
            'quantity_available' => $level->availableQuantity(),
        ];
    }

    protected function formatQty(string|float|int $qty): string
    {
        return bcadd((string) $qty, '0', 3);
    }
}
