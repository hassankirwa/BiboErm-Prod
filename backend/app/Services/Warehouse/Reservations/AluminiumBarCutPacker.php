<?php

namespace App\Services\Warehouse\Reservations;

/**
 * Nest aluminium cuts onto physical bars / remnants.
 *
 * Strategy: best-fit decreasing — largest cuts first, then place each cut on the
 * open bar with the least leftover room that still fits. This mirrors shop-floor
 * nesting (fill a beam with uneven lengths) so warehouse release does not issue
 * a virgin bar per BOM line.
 *
 * A small end allowance (default 20 mm) is reserved so packed used length never
 * consumes the full nominal bar — clamp/saw room.
 */
class AluminiumBarCutPacker
{
    public const DEFAULT_END_ALLOWANCE_MM = 20;

    /**
     * @param  list<int>  $cutLengthsMm  individual piece lengths (already expanded)
     * @return list<list<int>> each inner list is the cuts on one bar
     */
    public function packLengths(array $cutLengthsMm, int $barLengthMm, ?int $endAllowanceMm = null): array
    {
        $cuts = [];
        foreach ($cutLengthsMm as $lengthMm) {
            $lengthMm = (int) $lengthMm;
            if ($lengthMm > 0) {
                $cuts[] = ['length_mm' => $lengthMm];
            }
        }

        $packed = $this->packCuts($cuts, $barLengthMm, $endAllowanceMm);

        return array_map(
            fn (array $bar) => array_map(fn (array $cut) => (int) $cut['length_mm'], $bar),
            $packed,
        );
    }

    /**
     * @param  list<array{length_mm: int, project_bom_line_id?: int}>  $cuts
     * @return list<list<array{length_mm: int, project_bom_line_id?: int}>>
     */
    public function packCuts(array $cuts, int $barLengthMm, ?int $endAllowanceMm = null): array
    {
        $allowance = $endAllowanceMm ?? self::DEFAULT_END_ALLOWANCE_MM;
        $capacity = max(1, $barLengthMm - max(0, $allowance));

        usort($cuts, fn (array $a, array $b) => ((int) $b['length_mm']) <=> ((int) $a['length_mm']));

        $bars = [];
        foreach ($cuts as $cut) {
            $lengthMm = (int) $cut['length_mm'];
            if ($lengthMm <= 0) {
                continue;
            }

            // Oversized single cut still needs its own bar (cannot stitch).
            if ($lengthMm > $capacity) {
                $bars[] = [$cut];
                continue;
            }

            $bestIdx = null;
            $bestRemain = null;
            foreach ($bars as $index => $bar) {
                $usedMm = array_sum(array_map(fn (array $row) => (int) $row['length_mm'], $bar));
                // Skip bars that already hold an oversized-only placeholder beyond capacity.
                if ($usedMm > $capacity) {
                    continue;
                }
                $remain = $capacity - $usedMm - $lengthMm;
                if ($remain >= 0 && ($bestRemain === null || $remain < $bestRemain)) {
                    $bestIdx = $index;
                    $bestRemain = $remain;
                }
            }

            if ($bestIdx !== null) {
                $bars[$bestIdx][] = $cut;
            } else {
                $bars[] = [$cut];
            }
        }

        return array_values($bars);
    }

    /**
     * First-fit packing of remaining cuts onto a single piece (offcut or bar).
     *
     * @param  list<int>  $cutsSortedDesc
     * @return array{assigned: list<int>, remaining: list<int>}
     */
    public function packLengthsOntoCapacity(array $cutsSortedDesc, int $capacityMm, ?int $endAllowanceMm = null): array
    {
        $allowance = $endAllowanceMm ?? self::DEFAULT_END_ALLOWANCE_MM;
        $usable = max(1, $capacityMm - max(0, $allowance));

        $assigned = [];
        $remaining = [];
        $used = 0;

        foreach ($cutsSortedDesc as $cut) {
            $cut = (int) $cut;
            if ($cut <= 0) {
                continue;
            }
            if ($cut > $usable) {
                $remaining[] = $cut;
                continue;
            }
            if ($used + $cut <= $usable) {
                $assigned[] = $cut;
                $used += $cut;
            } else {
                $remaining[] = $cut;
            }
        }

        return ['assigned' => $assigned, 'remaining' => $remaining];
    }
}
