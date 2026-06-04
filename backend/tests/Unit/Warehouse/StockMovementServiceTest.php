<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\StockMovementType;
use App\Models\User;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\Movements\StockMovementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class StockMovementServiceTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    private StockMovementService $movements;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        $this->movements = app(StockMovementService::class);
        $this->user = $this->warehouseAluminiumManager();
    }

    public function test_receive_creates_inbound_movement_with_document_number(): void
    {
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'CAGE1');

        $movement = $this->movements->receive(
            performer: $this->user,
            lines: [[
                'item_id' => $item->id,
                'to_bin_id' => $bin->id,
                'quantity' => 12,
            ]],
            referenceType: 'goods_receipt',
            referenceId: 99,
        );

        $this->assertSame(StockMovementType::Inbound, $movement->movement_type);
        $this->assertStringStartsWith('SM-', $movement->movement_number);
        $this->assertCount(1, $movement->lines);

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();

        $this->assertSame('252.000', (string) $level->quantity_on_hand);
    }

    public function test_transfer_moves_quantity_between_bins(): void
    {
        $item = $this->itemBySku('ACC-HNG-001');
        $fromBin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        $toBin = $this->binBySectionAndCode('SEC-SLD', 'BIN3');
        $user = $this->warehouseAccessoriesManager();

        $this->movements->transfer(
            performer: $user,
            lines: [[
                'item_id' => $item->id,
                'from_bin_id' => $fromBin->id,
                'to_bin_id' => $toBin->id,
                'quantity' => 15,
            ]],
        );

        $fromLevel = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $fromBin->id)
            ->firstOrFail();

        $toLevel = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $toBin->id)
            ->firstOrFail();

        $this->assertSame('225.000', (string) $fromLevel->quantity_on_hand);
        $this->assertSame('15.000', (string) $toLevel->quantity_on_hand);
    }
}
