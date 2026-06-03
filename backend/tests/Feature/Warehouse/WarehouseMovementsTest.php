<?php

namespace Tests\Feature\Warehouse;

use App\Models\Warehouse\StockLevel;

class WarehouseMovementsTest extends WarehouseFeatureTestCase
{
    public function test_receive_stock_increases_on_hand(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'BIN1');

        $before = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/receive', [
                'notes' => 'GRN test receipt',
                'goods_receipt_id' => 42,
                'lines' => [[
                    'item_id' => $item->id,
                    'to_bin_id' => $bin->id,
                    'quantity' => 10,
                    'unit_cost' => 12.50,
                ]],
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'movement_type' => 'inbound',
                'reference_type' => 'goods_receipt',
                'reference_id' => 42,
            ]);

        $after = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(
            bcadd((string) $before, '10', 3),
            (string) $after
        );
    }

    public function test_transfer_moves_stock_between_bins(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('ACC-HNG-001');
        $fromBin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        $toBin = $this->binBySectionAndCode('SEC-SLD', 'BIN3');

        $beforeFrom = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $fromBin->id)
            ->value('quantity_on_hand');

        $beforeTo = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $toBin->id)
            ->value('quantity_on_hand') ?? '0.000';

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/transfer', [
                'notes' => 'Re-bin for picking',
                'lines' => [[
                    'item_id' => $item->id,
                    'from_bin_id' => $fromBin->id,
                    'to_bin_id' => $toBin->id,
                    'quantity' => 5,
                ]],
            ])
            ->assertCreated()
            ->assertJsonFragment(['movement_type' => 'transfer']);

        $afterFrom = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $fromBin->id)
            ->value('quantity_on_hand');

        $afterTo = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $toBin->id)
            ->value('quantity_on_hand');

        $this->assertSame(bcsub((string) $beforeFrom, '5', 3), (string) $afterFrom);
        $this->assertSame(bcadd((string) $beforeTo, '5', 3), (string) $afterTo);
    }

    public function test_adjustment_increases_and_decreases_stock(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-CSM-70MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-CSM-FRAME', 'BIN1');

        $before = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/adjust', [
                'notes' => 'Stock-take variance',
                'lines' => [[
                    'item_id' => $item->id,
                    'bin_id' => $bin->id,
                    'quantity' => 3,
                    'direction' => 'increase',
                ]],
            ])
            ->assertCreated()
            ->assertJsonFragment(['movement_type' => 'adjustment']);

        $increased = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(bcadd((string) $before, '3', 3), (string) $increased);

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/adjust', [
                'lines' => [[
                    'item_id' => $item->id,
                    'bin_id' => $bin->id,
                    'quantity' => 2,
                    'direction' => 'decrease',
                ]],
            ])
            ->assertCreated();

        $decreased = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(bcadd((string) $before, '1', 3), (string) $decreased);
    }

    public function test_issue_stock_decreases_on_hand(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'BIN1');
        $project = $this->createTestProject();

        $before = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/issue', [
                'project_id' => $project->id,
                'lines' => [[
                    'item_id' => $item->id,
                    'from_bin_id' => $bin->id,
                    'quantity' => 4,
                ]],
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'movement_type' => 'outbound',
                'reference_type' => 'project',
                'reference_id' => $project->id,
            ]);

        $after = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(bcsub((string) $before, '4', 3), (string) $after);
    }

    public function test_movements_index_lists_history(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'BIN1');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/receive', [
                'lines' => [[
                    'item_id' => $item->id,
                    'to_bin_id' => $bin->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertCreated();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/movements')
            ->assertOk()
            ->assertJsonFragment(['movement_type' => 'inbound']);
    }

    public function test_aluminium_manager_cannot_receive_into_accessories_bin(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/receive', [
                'lines' => [[
                    'item_id' => $item->id,
                    'to_bin_id' => $bin->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertForbidden();
    }

    public function test_accessories_manager_cannot_receive_into_aluminium_bin(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'BIN1');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/receive', [
                'lines' => [[
                    'item_id' => $item->id,
                    'to_bin_id' => $bin->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertForbidden();
    }

    public function test_issue_rejects_quantity_beyond_available_when_stock_is_reserved(): void
    {
        $reserver = $this->operationsManager();
        $user = $this->warehouseAccessoriesManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->firstOrFail();

        $reserveQty = bcsub((string) $level->quantity_on_hand, '5', 3);

        $this->actingAsSanctum($reserver)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => $reserveQty,
                ]],
            ])
            ->assertOk();

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/issue', [
                'lines' => [[
                    'item_id' => $item->id,
                    'from_bin_id' => $bin->id,
                    'quantity' => 6,
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines']);

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/issue', [
                'lines' => [[
                    'item_id' => $item->id,
                    'from_bin_id' => $bin->id,
                    'quantity' => 5,
                ]],
            ])
            ->assertCreated();
    }

    public function test_transfer_rejects_quantity_beyond_available_when_stock_is_reserved(): void
    {
        $reserver = $this->operationsManager();
        $user = $this->warehouseAccessoriesManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $fromBin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        $toBin = $this->binBySectionAndCode('SEC-SLD', 'BIN3');

        $level = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $fromBin->id)
            ->firstOrFail();

        $reserveQty = bcsub((string) $level->quantity_on_hand, '3', 3);

        $this->actingAsSanctum($reserver)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => $reserveQty,
                ]],
            ])
            ->assertOk();

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/transfer', [
                'lines' => [[
                    'item_id' => $item->id,
                    'from_bin_id' => $fromBin->id,
                    'to_bin_id' => $toBin->id,
                    'quantity' => 4,
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines']);
    }

    public function test_issue_to_project_releases_matching_reservation(): void
    {
        $reserver = $this->operationsManager();
        $user = $this->warehouseAccessoriesManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->actingAsSanctum($reserver)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'emit_events' => false,
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 6,
                ]],
            ])
            ->assertOk();

        $beforeReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/movements/issue', [
                'project_id' => $project->id,
                'lines' => [[
                    'item_id' => $item->id,
                    'from_bin_id' => $bin->id,
                    'quantity' => 4,
                ]],
            ])
            ->assertCreated();

        $afterReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->assertSame('6.000', (string) $beforeReserved);
        $this->assertSame('2.000', (string) $afterReserved);
    }
}
