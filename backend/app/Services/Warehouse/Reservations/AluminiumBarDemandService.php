<?php

namespace App\Services\Warehouse\Reservations;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\Offcuts\OffcutAllocationService;

/**
 * Computes aluminium stock demand by packing BOM cuts onto offcuts first,
 * then onto full virgin bars (standard_bar_length_mm). Never stitches short
 * pieces to synthesize a single cut longer than any one piece.
 */
class AluminiumBarDemandService
{
    public const DEFAULT_BAR_LENGTH_MM = 6000;

    public function __construct(
        protected OffcutAllocationService $offcuts,
        protected AluminiumBarCutPacker $packer,
    ) {}

    /**
     * @param  list<array{item_id: int, quantity: string|float, required_length_mm?: int|null, bom_line_ref?: string|null, project_bom_line_id?: int|null}>  $bomLinesForItem
     * @return array{
     *     item_id: int,
     *     sku: string,
     *     bar_length_mm: int,
     *     cuts: list<int>,
     *     cuts_total: int,
     *     offcut_assignments: list<array{offcut_id: int, length_mm: int, cuts: list<int>}>,
     *     offcut_piece_ids: list<int>,
     *     bars_needed: int,
     *     bar_pack: list<list<int>>,
     *     reserve_qty: string,
     *     reserve_uom: string,
     *     offcut_usable_metres: string
     * }
     */
    public function planForItem(Item $item, array $bomLinesForItem): array
    {
        $barLengthMm = $this->barLengthMm($item);
        $cuts = $this->expandCuts($bomLinesForItem);

        // Legacy / stock-check lines without cut length: treat quantity as full bars/pcs.
        if ($cuts === []) {
            $qty = 0;
            foreach ($bomLinesForItem as $line) {
                $qty += max(0, (int) round((float) $line['quantity']));
            }

            return [
                'item_id' => $item->id,
                'sku' => $item->sku,
                'bar_length_mm' => $barLengthMm,
                'cuts' => [],
                'cuts_total' => $qty,
                'offcut_assignments' => [],
                'offcut_piece_ids' => [],
                'bars_needed' => $qty,
                'bar_pack' => array_fill(0, $qty, []),
                'reserve_qty' => $this->reserveQuantity($item, $qty, $barLengthMm),
                'reserve_uom' => $this->isMetreUom($item) ? 'metre' : 'pcs',
                'offcut_usable_metres' => '0.000',
            ];
        }

        // Longest cuts first so large pieces claim capable offcuts/bars early.
        rsort($cuts, SORT_NUMERIC);

        $offcutAssignments = [];
        $remainingCuts = $cuts;
        $usedOffcutIds = [];

        if ($cuts !== []) {
            $minCut = min($cuts);
            $availableOffcuts = $this->offcuts->searchUsable($item->id, $minCut)
                ->sortBy([
                    ['length_mm', 'asc'],
                    ['logged_at', 'asc'],
                ])
                ->values();

            foreach ($availableOffcuts as $offcut) {
                if ($remainingCuts === []) {
                    break;
                }
                if (isset($usedOffcutIds[$offcut->id])) {
                    continue;
                }

                $packed = $this->packCutsOntoLength($remainingCuts, (int) $offcut->length_mm);
                if ($packed['assigned'] === []) {
                    continue;
                }

                $offcutAssignments[] = [
                    'offcut_id' => $offcut->id,
                    'length_mm' => (int) $offcut->length_mm,
                    'cuts' => $packed['assigned'],
                ];
                $usedOffcutIds[$offcut->id] = true;
                $remainingCuts = $packed['remaining'];
            }
        }

        // Nest remaining cuts onto the fewest virgin bars (best-fit + end allowance).
        $barPack = $this->packer->packLengths($remainingCuts, $barLengthMm);

        $barsNeeded = count($barPack);
        $reserveQty = $this->reserveQuantity($item, $barsNeeded, $barLengthMm);
        $offcutMetres = $this->offcutAssignmentsMetres($offcutAssignments);

        return [
            'item_id' => $item->id,
            'sku' => $item->sku,
            'bar_length_mm' => $barLengthMm,
            'cuts' => $cuts,
            'cuts_total' => count($cuts),
            'offcut_assignments' => $offcutAssignments,
            'offcut_piece_ids' => array_values(array_unique(array_column($offcutAssignments, 'offcut_id'))),
            'bars_needed' => $barsNeeded,
            'bar_pack' => $barPack,
            'reserve_qty' => $reserveQty,
            'reserve_uom' => $this->isMetreUom($item) ? 'metre' : 'pcs',
            'offcut_usable_metres' => $offcutMetres,
        ];
    }

    /**
     * Group BOM lines into combined SKU demand plans.
     * Aluminium: nest cuts onto 6m bars. Rubber (metre): exact cut metres (no bar rounding).
     *
     * @param  list<array{item_id: int, quantity: string|float, required_length_mm?: int|null, bom_line_ref?: string|null, project_bom_line_id?: int|null}>  $bomLines
     * @param  \Illuminate\Support\Collection<int, Item>  $items
     * @return array<int, array<string, mixed>> item_id => plan
     */
    public function plansByItemId($items, array $bomLines): array
    {
        $grouped = [];
        foreach ($bomLines as $line) {
            $itemId = (int) $line['item_id'];
            $item = $items->get($itemId);
            if (! $item) {
                continue;
            }
            $grouped[$itemId][] = $line;
        }

        $plans = [];
        foreach ($grouped as $itemId => $lines) {
            $item = $items->get($itemId);
            if (! $item || ! $this->shouldCombineCuts($item, $lines)) {
                continue;
            }
            $plans[$itemId] = $this->shouldPackOntoBars($item)
                ? $this->planForItem($item, $lines)
                : $this->exactMetrePlanForItem($item, $lines);
        }

        return $plans;
    }

    /**
     * Rubber/seal metre demand: sum fabrication cut lengths exactly (no 6m bar rounding).
     *
     * @param  list<array{item_id: int, quantity: string|float, required_length_mm?: int|null}>  $bomLinesForItem
     * @return array<string, mixed>
     */
    public function exactMetrePlanForItem(Item $item, array $bomLinesForItem): array
    {
        $cuts = $this->expandCuts($bomLinesForItem);
        $totalMm = array_sum($cuts);

        return [
            'item_id' => $item->id,
            'sku' => $item->sku,
            'bar_length_mm' => null,
            'cuts' => $cuts,
            'cuts_total' => count($cuts),
            'offcut_assignments' => [],
            'offcut_piece_ids' => [],
            'bars_needed' => null,
            'bar_pack' => [],
            'reserve_qty' => $totalMm > 0 ? bcdiv((string) $totalMm, '1000', 3) : '0.000',
            'reserve_uom' => 'metre',
            'offcut_usable_metres' => '0.000',
            'packing_mode' => 'exact_metres',
        ];
    }

    /**
     * Combined SKU reservation: aluminium bars, or metre rubber with cut lengths.
     *
     * @param  list<array{item_id?: int, quantity?: string|float, required_length_mm?: int|null}>  $bomLinesForItem
     */
    public function shouldCombineCuts(Item $item, array $bomLinesForItem = []): bool
    {
        if ($this->shouldPackOntoBars($item)) {
            return true;
        }

        if ($item->category !== ItemCategory::Rubber || ! $this->isMetreUom($item)) {
            return false;
        }

        foreach ($bomLinesForItem as $line) {
            if ((int) ($line['required_length_mm'] ?? 0) > 0) {
                return true;
            }
        }

        return false;
    }

    /** Only aluminium profiles nest onto standard 6m bars. */
    public function shouldPackOntoBars(Item $item): bool
    {
        return $item->category === ItemCategory::AluminiumProfile;
    }

    /**
     * @deprecated Use shouldCombineCuts / shouldPackOntoBars
     *
     * @param  list<array{item_id?: int, quantity?: string|float, required_length_mm?: int|null}>  $bomLinesForItem
     */
    public function shouldPackCuts(Item $item, array $bomLinesForItem = []): bool
    {
        return $this->shouldCombineCuts($item, $bomLinesForItem);
    }

    public function barLengthMm(Item $item): int
    {
        $item->loadMissing('aluminiumProfile');
        $fromProfile = (int) ($item->aluminiumProfile?->standard_bar_length_mm ?? 0);

        return $fromProfile > 0 ? $fromProfile : self::DEFAULT_BAR_LENGTH_MM;
    }

    /**
     * @param  list<array{item_id: int, quantity: string|float, required_length_mm?: int|null}>  $bomLinesForItem
     * @return list<int>
     */
    protected function expandCuts(array $bomLinesForItem): array
    {
        $cuts = [];
        foreach ($bomLinesForItem as $line) {
            $length = (int) ($line['required_length_mm'] ?? 0);
            $qty = max(0, (int) round((float) $line['quantity']));
            if ($length <= 0 || $qty <= 0) {
                continue;
            }
            for ($i = 0; $i < $qty; $i++) {
                $cuts[] = $length;
            }
        }

        return $cuts;
    }

    /**
     * Pack remaining cuts onto a single piece/bar length (with end allowance).
     *
     * @param  list<int>  $cutsSortedDesc
     * @return array{assigned: list<int>, remaining: list<int>}
     */
    protected function packCutsOntoLength(array $cutsSortedDesc, int $capacityMm): array
    {
        return $this->packer->packLengthsOntoCapacity($cutsSortedDesc, $capacityMm);
    }

    protected function reserveQuantity(Item $item, int $barsNeeded, int $barLengthMm): string
    {
        if ($barsNeeded <= 0) {
            return '0.000';
        }

        if ($this->isMetreUom($item)) {
            $metresPerBar = bcdiv((string) $barLengthMm, '1000', 3);

            return bcmul((string) $barsNeeded, $metresPerBar, 3);
        }

        return number_format($barsNeeded, 3, '.', '');
    }

    public function isMetreUom(Item $item): bool
    {
        $uom = strtolower(trim((string) ($item->unit_of_measure ?? '')));

        return in_array($uom, ['m', 'metre', 'meter', 'metres', 'meters', 'mt'], true)
            || $uom === '';
    }

    /**
     * @param  list<array{offcut_id: int, length_mm: int, cuts: list<int>}>  $assignments
     */
    protected function offcutAssignmentsMetres(array $assignments): string
    {
        $mm = 0;
        foreach ($assignments as $row) {
            $mm += (int) $row['length_mm'];
        }

        return bcdiv((string) $mm, '1000', 3);
    }
}
