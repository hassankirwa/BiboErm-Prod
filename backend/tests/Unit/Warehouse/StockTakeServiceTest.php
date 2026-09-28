<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\StockMovementType;
use App\Models\User;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockMovement;
use App\Services\Warehouse\StockTake\StockTakeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class StockTakeServiceTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    private StockTakeService $stockTake;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        $this->stockTake = app(StockTakeService::class);
        $this->user = $this->warehouseAccessoriesManager();
    }

    public function test_snapshot_returns_seeded_stock_lines_for_deck(): void
    {
        $snapshot = $this->stockTake->snapshot($this->user, ['deck' => 'accessories']);

        $this->assertNotEmpty($snapshot['lines']);
        $this->assertSame('accessories', $snapshot['filters']['deck']);
        $this->assertArrayHasKey('snapshot_at', $snapshot);
        $this->assertArrayHasKey('line_count', $snapshot);
        $this->assertArrayHasKey('categories', $snapshot);

        $hingeLine = collect($snapshot['lines'])->first(
            fn (array $line) => $line['sku'] === 'ACC-HNG-001'
        );

        $this->assertNotNull($hingeLine);
        $this->assertSame('240.000', $hingeLine['quantity_on_hand']);
        $this->assertSame('SEC-SLD', $hingeLine['section_code']);
        $this->assertSame('accessory', $hingeLine['category']);
    }

    public function test_snapshot_by_category_lists_items_grouped(): void
    {
        $snapshot = $this->stockTake->snapshot($this->user, ['category' => 'accessory']);

        $this->assertNotEmpty($snapshot['lines']);
        $this->assertSame('accessory', $snapshot['filters']['category']);
        $this->assertNotEmpty($snapshot['categories']);
        $this->assertSame('accessory', $snapshot['categories'][0]['category']);
        $this->assertSame('Accessories', $snapshot['categories'][0]['label']);

        foreach ($snapshot['lines'] as $line) {
            $this->assertSame('accessory', $line['category']);
        }
    }

    public function test_variance_reports_difference_between_counted_and_system_qty(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $report = $this->stockTake->variance([[
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'counted_qty' => 235,
            'variance_reason' => 'Damaged units',
        ]]);

        $this->assertSame(1, $report['summary']['lines_with_variance']);
        $this->assertSame('-5.000', $report['lines'][0]['variance']);
        $this->assertSame('decrease', $report['lines'][0]['direction']);
        $this->assertTrue($report['lines'][0]['has_variance']);
        $this->assertSame('Damaged units', $report['lines'][0]['variance_reason']);
    }

    public function test_variance_shows_no_difference_when_counts_match_system(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $report = $this->stockTake->variance([[
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'counted_qty' => 240,
        ]]);

        $this->assertSame(0, $report['summary']['lines_with_variance']);
        $this->assertFalse($report['lines'][0]['has_variance']);
        $this->assertSame('none', $report['lines'][0]['direction']);
    }

    public function test_apply_creates_stock_take_adjustment_and_updates_on_hand(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $movement = $this->stockTake->apply($this->user, [[
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'counted_qty' => 235,
            'variance_reason' => 'Physical count shortfall',
        ]], 'May stock-take');

        $this->assertInstanceOf(StockMovement::class, $movement);
        $this->assertSame(StockMovementType::Adjustment, $movement->movement_type);
        $this->assertSame('stock_take', $movement->reference_type);
        $this->assertStringStartsWith('SM-', $movement->movement_number);
        $this->assertStringContainsString('May stock-take', (string) $movement->notes);
        $this->assertStringContainsString('Physical count shortfall', (string) $movement->notes);
        $this->assertStringContainsString('ACC-HNG-001', (string) $movement->notes);

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();

        $this->assertSame('235.000', (string) $level->quantity_on_hand);
    }

    public function test_apply_requires_variance_reason(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Variance reason is required');

        $this->stockTake->apply($this->user, [[
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'counted_qty' => 235,
        ]]);
    }

    public function test_apply_throws_when_there_are_no_variances(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('No variances to apply');

        $this->stockTake->apply($this->user, [[
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'counted_qty' => 240,
            'variance_reason' => 'N/A',
        ]]);
    }
}
