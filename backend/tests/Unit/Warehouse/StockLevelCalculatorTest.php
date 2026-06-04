<?php

namespace Tests\Unit\Warehouse;

use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\Inventory\StockLevelCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class StockLevelCalculatorTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    private StockLevelCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        $this->calculator = app(StockLevelCalculator::class);
    }

    public function test_available_for_item_sums_bin_availability(): void
    {
        $item = $this->itemBySku('PROF-SLD-80MM');

        $this->assertSame('240.000', $this->calculator->availableForItem($item));
    }

    public function test_increment_and_decrement_on_hand(): void
    {
        $item = $this->itemBySku('PROF-CSM-70MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-CSM-FRAME', 'CAGE2');

        $this->calculator->incrementOnHand($item->id, $bin->id, '5.500');
        $this->calculator->decrementOnHand($item->id, $bin->id, '2.000');

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();

        $this->assertSame('3.500', (string) $level->quantity_on_hand);
    }

    public function test_reserved_qty_reduces_available_without_touching_on_hand(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $beforeOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->calculator->incrementReserved($item->id, $bin->id, '10.000');

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();

        $this->assertSame((string) $beforeOnHand, (string) $level->quantity_on_hand);
        $this->assertSame('10.000', (string) $level->quantity_reserved);
        $this->assertSame(
            bcsub((string) $beforeOnHand, '10.000', 3),
            $level->availableQuantity()
        );
    }

    public function test_decrement_on_hand_throws_when_insufficient(): void
    {
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'CAGE1');

        $this->expectException(\InvalidArgumentException::class);

        $this->calculator->decrementOnHand($item->id, $bin->id, '999999');
    }

    public function test_assert_sufficient_available_rejects_reserved_stock(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->calculator->incrementReserved($item->id, $bin->id, '10.000');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Insufficient available quantity.');

        $this->calculator->assertSufficientAvailable($item->id, $bin->id, '999999');
    }
}
