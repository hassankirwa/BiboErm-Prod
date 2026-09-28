<?php

namespace Tests\Feature\Warehouse;

use App\Enums\ProjectStage;
use App\Enums\Warehouse\MaterialRequestStatus;
use App\Enums\Warehouse\StockMovementType;
use App\Models\Warehouse\MaterialRequest;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockMovement;

class WarehouseReturnsAndMaterialRequestsTest extends WarehouseFeatureTestCase
{
    public function test_return_extra_stock_increments_bin_on_hand(): void
    {
        $manager = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        $project = $this->createTestProject(['stage' => ProjectStage::Installation->value]);

        $before = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->actingAsSanctum($manager)
            ->postJson('/api/v1/warehouse/movements/return', [
                'project_id' => $project->id,
                'notes' => 'Leftover hinges from site',
                'lines' => [[
                    'item_id' => $item->id,
                    'to_bin_id' => $bin->id,
                    'quantity' => 3,
                ]],
            ])
            ->assertSuccessful()
            ->assertJsonPath('data.movement_type', StockMovementType::Return->value);

        $after = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertSame(0, bccomp(bcsub($after, $before, 3), '3.000', 3));
        $this->assertDatabaseHas('stock_movements', [
            'movement_type' => 'return',
            'reference_type' => 'project',
            'reference_id' => $project->id,
        ]);
    }

    public function test_create_and_fulfill_additional_material_request(): void
    {
        $manager = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        $project = $this->createTestProject(['stage' => ProjectStage::FabricationStage->value]);

        $create = $this->actingAsSanctum($manager)
            ->postJson('/api/v1/warehouse/material-requests', [
                'project_id' => $project->id,
                'source' => 'warehouse',
                'reason' => 'Damaged on fab floor',
                'lines' => [[
                    'warehouse_item_id' => $item->id,
                    'quantity' => 2,
                ]],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame('pending', $create['status']);
        $lineId = $create['lines'][0]['id'];

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/material-requests/{$create['id']}/fulfill", [
                'lines' => [[
                    'line_id' => $lineId,
                    'from_bin_id' => $bin->id,
                    'quantity' => 2,
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', MaterialRequestStatus::Fulfilled->value);

        $this->assertInstanceOf(MaterialRequest::class, MaterialRequest::query()->find($create['id']));
        $this->assertDatabaseHas('stock_movements', [
            'movement_type' => StockMovementType::Outbound->value,
            'reference_id' => $project->id,
        ]);
    }

    public function test_cannot_request_materials_for_completed_project(): void
    {
        $manager = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('ACC-HNG-001');
        $project = $this->createTestProject(['stage' => ProjectStage::ProjectComplete->value]);

        $this->actingAsSanctum($manager)
            ->postJson('/api/v1/warehouse/material-requests', [
                'project_id' => $project->id,
                'source' => 'warehouse',
                'lines' => [[
                    'warehouse_item_id' => $item->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertStatus(422);
    }
}
