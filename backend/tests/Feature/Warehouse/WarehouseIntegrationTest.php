<?php

namespace Tests\Feature\Warehouse;

use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Enums\Warehouse\ReservationStatus;
use App\Events\Procurement\GoodsReceiptVerified;
use App\Events\Production\ProductionStageCompleted;
use App\Events\Projects\ProjectBomFinalized;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockReservation;
use Illuminate\Support\Carbon;

class WarehouseIntegrationTest extends WarehouseFeatureTestCase
{
    public function test_project_bom_finalized_triggers_reservation(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialCheck->value]);
        $item = $this->itemBySku('ACC-HNG-001');

        event(new ProjectBomFinalized(
            projectId: $project->id,
            bomId: 1,
            version: 1,
            finalizedByUserId: $user->id,
            lineSummary: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => 5,
                'bom_line_ref' => 'BOM-1',
            ]],
        ));

        $reservation = StockReservation::query()->where('project_id', $project->id)->first();

        $this->assertNotNull($reservation);
        $this->assertSame(ReservationStatus::Pending, $reservation->status);
    }

    public function test_project_bom_finalized_does_not_reserve_when_stock_insufficient(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialCheck->value]);
        $item = $this->itemBySku('ACC-HNG-001');

        event(new ProjectBomFinalized(
            projectId: $project->id,
            bomId: 1,
            version: 1,
            finalizedByUserId: $user->id,
            lineSummary: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => 999999,
            ]],
        ));

        $this->assertSame(0, StockReservation::query()->where('project_id', $project->id)->count());
    }

    public function test_goods_receipt_verified_creates_inbound_movement(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $before = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        event(new GoodsReceiptVerified(
            goodsReceiptId: 501,
            purchaseOrderId: 901,
            projectId: null,
            verifiedByUserId: $user->id,
            acceptedLines: [[
                'warehouse_item_id' => $item->id,
                'qty_accepted' => 4,
                'to_bin_id' => $bin->id,
            ]],
        ));

        $after = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(bcadd((string) $before, '4', 3), (string) $after);
    }

    public function test_goods_receipt_verified_fulfills_project_shortage(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject(['stage' => ProjectStage::AwaitingProcurement->value]);
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $available = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail()
            ->availableQuantity();

        $required = bcadd($available, '10', 3);

        event(new ProjectBomFinalized(
            projectId: $project->id,
            bomId: 1,
            version: 1,
            finalizedByUserId: $user->id,
            lineSummary: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => $required,
            ]],
        ));

        $this->assertSame(0, StockReservation::query()->where('project_id', $project->id)->count());

        event(new GoodsReceiptVerified(
            goodsReceiptId: 777,
            purchaseOrderId: 888,
            projectId: $project->id,
            verifiedByUserId: $user->id,
            acceptedLines: [[
                'warehouse_item_id' => $item->id,
                'qty_accepted' => 10,
                'to_bin_id' => $bin->id,
            ]],
            bomLineSummary: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => $required,
            ]],
        ));

        $reservation = StockReservation::query()->where('project_id', $project->id)->first();
        $this->assertNotNull($reservation);
        $this->assertSame(ReservationStatus::Pending, $reservation->status);
    }

    public function test_production_stage_completed_releases_profile_stock_on_cutting(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject(['stage' => ProjectStage::CuttingStage->value]);
        $accessory = $this->itemBySku('ACC-HNG-001');
        $profile = $this->itemBySku('PROF-SLD-80MM');
        $accessoryBin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        $profileBin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'CAGE1');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'emit_events' => false,
                'lines' => [
                    ['item_id' => $accessory->id, 'quantity' => 3],
                    ['item_id' => $profile->id, 'quantity' => 2],
                ],
            ])
            ->assertOk();

        $reservation = StockReservation::query()->where('project_id', $project->id)->firstOrFail();

        event(new ProductionStageCompleted(
            productionOrderId: 1,
            projectId: $project->id,
            stage: ProductionStage::Cutting,
            completedByUserId: $releaser->id,
            completedAt: Carbon::now(),
        ));

        $profileReserved = StockLevel::query()
            ->where('item_id', $profile->id)
            ->where('bin_id', $profileBin->id)
            ->value('quantity_reserved');

        $accessoryReserved = StockLevel::query()
            ->where('item_id', $accessory->id)
            ->where('bin_id', $accessoryBin->id)
            ->value('quantity_reserved');

        $this->assertSame('0.000', (string) $profileReserved);
        $this->assertSame('3.000', (string) $accessoryReserved);
        $this->assertSame(ReservationStatus::Partial, $reservation->fresh()->status);
    }
}
