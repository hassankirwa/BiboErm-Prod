<?php

namespace Tests\Unit\Warehouse;

use App\Enums\ProjectStage;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\User;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\Reservations\BomStockCheckService;
use App\Services\Warehouse\Reservations\FifoQueueDemandRegistry;
use App\Services\Warehouse\Reservations\FifoReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class FifoReservationServiceTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    private FifoReservationService $fifo;

    private BomStockCheckService $bomCheck;

    private FifoQueueDemandRegistry $demandRegistry;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        $this->fifo = app(FifoReservationService::class);
        $this->bomCheck = app(BomStockCheckService::class);
        $this->demandRegistry = app(FifoQueueDemandRegistry::class);
        $this->user = $this->warehouseAccessoriesManager();
    }

    public function test_bom_stock_check_detects_shortage(): void
    {
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');

        $check = $this->bomCheck->check($project->id, [[
            'item_id' => $item->id,
            'quantity' => 99999,
        ]]);

        $this->assertFalse($check['can_fully_reserve']);
        $this->assertGreaterThan(0, (float) $check['lines'][0]['shortage']);
    }

    public function test_bom_stock_check_respects_ahead_queue_demand(): void
    {
        $aheadProject = $this->createTestProject(['stage' => ProjectStage::MaterialCheck->value]);
        $laterProject = $this->createTestProject(['stage' => ProjectStage::MaterialCheck->value]);
        $item = $this->itemBySku('ACC-HNG-001');

        $totalAvailable = app(\App\Services\Warehouse\Inventory\StockLevelCalculator::class)
            ->availableForItem($item);

        $this->demandRegistry->record($aheadProject->id, [[
            'item_id' => $item->id,
            'quantity' => bcsub($totalAvailable, '5', 3),
        ]]);

        $check = $this->bomCheck->check($laterProject->id, [[
            'item_id' => $item->id,
            'quantity' => 10,
        ]]);

        $this->assertFalse($check['can_fully_reserve']);
        $this->assertGreaterThan(0, (float) $check['lines'][0]['ahead_unreserved_demand']);
    }

    public function test_reserve_allocates_from_preferred_accessory_bin(): void
    {
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $preferredBin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $result = $this->fifo->reserveForProject(
            user: $this->user,
            projectId: $project->id,
            bomLines: [[
                'item_id' => $item->id,
                'quantity' => 12,
                'bom_line_ref' => 'LINE-1',
            ]],
        );

        $this->assertTrue($result['success']);
        $this->assertSame(ReservationStatus::Pending, $result['reservation']->status);
        $this->assertSame($preferredBin->id, $result['reservation']->lines->first()->bin_id);

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $preferredBin->id)
            ->firstOrFail();

        $this->assertSame('12.000', (string) $level->quantity_reserved);
    }

    public function test_release_reduces_reserved_and_on_hand(): void
    {
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HDL-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN1');

        $result = $this->fifo->reserveForProject(
            user: $this->user,
            projectId: $project->id,
            bomLines: [[
                'item_id' => $item->id,
                'quantity' => 5,
            ]],
        );

        $beforeOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $released = $this->fifo->release($result['reservation']);

        $this->assertSame(ReservationStatus::Released, $released->status);

        $afterOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(bcsub((string) $beforeOnHand, '5', 3), (string) $afterOnHand);
    }

    public function test_release_caps_to_stock_level_reserved_when_drifted(): void
    {
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HDL-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN1');

        $result = $this->fifo->reserveForProject(
            user: $this->user,
            projectId: $project->id,
            bomLines: [[
                'item_id' => $item->id,
                'quantity' => 5,
            ]],
        );

        $line = $result['reservation']->lines->first();
        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();
        $level->quantity_reserved = '0';
        $level->save();

        $released = $this->fifo->release($result['reservation']->fresh());

        $this->assertSame('0.000', (string) $level->fresh()->quantity_reserved);
        $this->assertSame('0.000', (string) $line->fresh()->quantity_released);
        $this->assertSame(ReservationStatus::Partial, $released->status);
    }
}
