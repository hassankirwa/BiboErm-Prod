<?php

namespace Tests\Feature\Warehouse;

use App\Enums\Warehouse\OffcutStatus;
use App\Models\Warehouse\OffcutPiece;
use App\Models\Warehouse\StockLevel;

class WarehouseOffcutsTest extends WarehouseFeatureTestCase
{
    public function test_log_offcut_creates_piece_and_inbound_movement(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');
        $project = $this->createTestProject();

        $beforeOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand') ?? '0.000';

        $response = $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/offcuts', [
                'item_id' => $item->id,
                'bin_id' => $bin->id,
                'length_mm' => 1500,
                'quantity_pieces' => 2,
                'source_project_id' => $project->id,
                'notes' => 'Cutting waste',
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'length_mm' => 1500,
                'status' => OffcutStatus::Available->value,
            ]);

        $offcutId = $response->json('data.id');

        $this->assertDatabaseHas('offcut_pieces', [
            'id' => $offcutId,
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'source_project_id' => $project->id,
            'status' => OffcutStatus::Available->value,
        ]);

        $afterOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        // 1500mm x 2 pieces = 3000mm = 3.000 metres
        $this->assertSame(
            bcadd((string) $beforeOnHand, '3.000', 3),
            (string) $afterOnHand
        );
    }

    public function test_offcuts_index_supports_profile_and_min_length_filters(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');

        OffcutPiece::query()->create([
            'offcut_number' => 'OFF-TEST-001',
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'length_mm' => 1200,
            'quantity_pieces' => 1,
            'status' => OffcutStatus::Available,
            'logged_by' => $user->id,
            'logged_at' => now(),
            'created_at' => now(),
        ]);

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/offcuts?profile=SLD&min_length=1000')
            ->assertOk()
            ->assertJsonFragment(['length_mm' => 1200]);

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/offcuts?sku=PROF-SLD')
            ->assertOk()
            ->assertJsonFragment(['offcut_number' => 'OFF-TEST-001']);
    }

    public function test_allocate_offcut_assigns_project(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');
        $sourceProject = $this->createTestProject();
        $targetProject = $this->createTestProject();

        $offcut = OffcutPiece::query()->create([
            'offcut_number' => 'OFF-TEST-002',
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'length_mm' => 800,
            'quantity_pieces' => 1,
            'source_project_id' => $sourceProject->id,
            'status' => OffcutStatus::Available,
            'logged_by' => $user->id,
            'logged_at' => now(),
            'created_at' => now(),
        ]);

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/offcuts/{$offcut->id}/allocate", [
                'project_id' => $targetProject->id,
            ])
            ->assertOk()
            ->assertJsonFragment([
                'status' => OffcutStatus::Allocated->value,
                'allocated_project_id' => $targetProject->id,
            ]);
    }

    public function test_accessories_manager_cannot_log_offcuts(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/offcuts', [
                'item_id' => $item->id,
                'bin_id' => $bin->id,
                'length_mm' => 500,
            ])
            ->assertForbidden();
    }
}
