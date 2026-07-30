<?php

namespace Tests\Unit\Warehouse;

use App\Services\Warehouse\Reservations\AluminiumBarCutPacker;
use PHPUnit\Framework\TestCase;

class AluminiumBarCutPackerTest extends TestCase
{
    public function test_py06_mixed_lengths_nest_onto_two_bars_not_four(): void
    {
        $packer = new AluminiumBarCutPacker;

        // Shop example: remnants from shorter cuts must absorb the longer leftovers.
        $bars = $packer->packLengths([1408, 2868, 3683, 2828], 6000);

        $this->assertCount(2, $bars);

        $used = array_map(fn (array $bar) => array_sum($bar), $bars);
        $this->assertTrue(max($used) <= 6000 - AluminiumBarCutPacker::DEFAULT_END_ALLOWANCE_MM);
        $this->assertSame(1408 + 2868 + 3683 + 2828, array_sum($used));
    }

    public function test_best_fit_places_short_cut_into_largest_remnant(): void
    {
        $packer = new AluminiumBarCutPacker;

        $bars = $packer->packCuts([
            ['length_mm' => 3683, 'project_bom_line_id' => 1],
            ['length_mm' => 1408, 'project_bom_line_id' => 2],
            ['length_mm' => 2868, 'project_bom_line_id' => 3],
            ['length_mm' => 2828, 'project_bom_line_id' => 4],
        ], 6000);

        $this->assertCount(2, $bars);

        $hasNestedLongWithShort = false;
        foreach ($bars as $bar) {
            $lengths = array_column($bar, 'length_mm');
            sort($lengths);
            if ($lengths === [1408, 3683]) {
                $hasNestedLongWithShort = true;
            }
        }

        $this->assertTrue(
            $hasNestedLongWithShort,
            'Expected 1408 mm to nest with 3683 mm on the same bar (usable remnant).',
        );
    }

    public function test_end_allowance_prevents_packing_to_exact_bar_length(): void
    {
        $packer = new AluminiumBarCutPacker;

        // 3000 + 2981 = 5981 > usable 5980 → needs second bar.
        $bars = $packer->packLengths([3000, 2981], 6000);

        $this->assertCount(2, $bars);
    }

    public function test_three_equal_cuts_still_fit_one_bar_with_allowance(): void
    {
        $packer = new AluminiumBarCutPacker;

        $bars = $packer->packLengths([1000, 1000, 1000], 6000);

        $this->assertCount(1, $bars);
        $this->assertSame([1000, 1000, 1000], $bars[0]);
    }
}
