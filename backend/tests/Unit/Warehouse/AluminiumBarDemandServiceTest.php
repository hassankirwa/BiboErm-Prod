<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\OffcutStatus;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\OffcutPiece;
use App\Services\Warehouse\Reservations\AluminiumBarDemandService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AluminiumBarDemandServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_three_metre_cuts_pack_onto_one_six_metre_bar(): void
    {
        $item = $this->makeAluminiumItem();

        $plan = app(AluminiumBarDemandService::class)->planForItem($item, [[
            'item_id' => $item->id,
            'quantity' => 3,
            'required_length_mm' => 1000,
        ]]);

        $this->assertSame(1, $plan['bars_needed']);
        $this->assertSame('1.000', $plan['reserve_qty']);
        $this->assertSame([], $plan['offcut_piece_ids']);
    }

    public function test_cut_longer_than_offcut_needs_full_bar_without_stitching(): void
    {
        $item = $this->makeAluminiumItem();
        $user = User::factory()->create();

        OffcutPiece::query()->create([
            'offcut_number' => 'OFF-SHORT-5000',
            'item_id' => $item->id,
            'length_mm' => 5000,
            'quantity_pieces' => 1,
            'source_project_id' => null,
            'status' => OffcutStatus::Available->value,
            'logged_by' => $user->id,
            'logged_at' => now(),
        ]);

        // Short remnants that must never be stitched into a 1000mm cut.
        OffcutPiece::query()->create([
            'offcut_number' => 'OFF-STITCH-200',
            'item_id' => $item->id,
            'length_mm' => 200,
            'quantity_pieces' => 1,
            'source_project_id' => null,
            'status' => OffcutStatus::Available->value,
            'logged_by' => $user->id,
            'logged_at' => now(),
        ]);

        OffcutPiece::query()->create([
            'offcut_number' => 'OFF-STITCH-800',
            'item_id' => $item->id,
            'length_mm' => 800,
            'quantity_pieces' => 1,
            'source_project_id' => null,
            'status' => OffcutStatus::Available->value,
            'logged_by' => $user->id,
            'logged_at' => now(),
        ]);

        $plan = app(AluminiumBarDemandService::class)->planForItem($item, [[
            'item_id' => $item->id,
            'quantity' => 1,
            'required_length_mm' => 5500,
        ]]);

        $this->assertSame(1, $plan['bars_needed']);
        $this->assertSame([], $plan['offcut_piece_ids']);
        $this->assertSame('1.000', $plan['reserve_qty']);
    }

    public function test_usable_offcut_covers_cut_without_virgin_bar(): void
    {
        $item = $this->makeAluminiumItem();
        $user = User::factory()->create();

        $offcut = OffcutPiece::query()->create([
            'offcut_number' => 'OFF-USABLE-3200',
            'item_id' => $item->id,
            'length_mm' => 3200,
            'quantity_pieces' => 1,
            'source_project_id' => null,
            'status' => OffcutStatus::Available->value,
            'logged_by' => $user->id,
            'logged_at' => now(),
        ]);

        $plan = app(AluminiumBarDemandService::class)->planForItem($item, [[
            'item_id' => $item->id,
            'quantity' => 1,
            'required_length_mm' => 3000,
        ]]);

        $this->assertSame(0, $plan['bars_needed']);
        $this->assertSame('0.000', $plan['reserve_qty']);
        $this->assertSame([$offcut->id], $plan['offcut_piece_ids']);
    }

    public function test_mixed_uneven_cuts_nest_so_warehouse_does_not_over_issue_bars(): void
    {
        $item = $this->makeAluminiumItem();

        // Four PY06-style lengths that must share beams, not take four virgin bars.
        $plan = app(AluminiumBarDemandService::class)->planForItem($item, [
            ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 1408],
            ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 2868],
            ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 3683],
            ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 2828],
        ]);

        $this->assertSame(2, $plan['bars_needed']);
        $this->assertCount(2, $plan['bar_pack']);
        $this->assertSame('2.000', $plan['reserve_qty']);
    }

    protected function makeAluminiumItem(): Item
    {
        return Item::query()->create([
            'sku' => 'ALU-PACK-'.uniqid(),
            'name' => 'Pack Profile',
            'category' => ItemCategory::AluminiumProfile->value,
            'unit_of_measure' => 'pcs',
        ]);
    }
}
