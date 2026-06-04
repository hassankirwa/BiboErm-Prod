<?php

namespace Tests\Feature\Warehouse;

use App\Enums\Warehouse\OffcutStatus;
use App\Models\Warehouse\OffcutPiece;
use App\Models\Warehouse\StockReservation;

class WarehouseExtendedFeaturesTest extends WarehouseFeatureTestCase
{
    public function test_consume_offcut_marks_piece_consumed(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');
        $bin = $this->binBySectionAndCode('SEC-OFF-SLD80', 'BIN1');

        $logResponse = $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/offcuts', [
                'item_id' => $item->id,
                'bin_id' => $bin->id,
                'length_mm' => 1200,
                'quantity_pieces' => 1,
            ])
            ->assertCreated();

        $offcutId = $logResponse->json('data.id');

        $this->actingAsSanctum($user)
            ->patchJson("/api/v1/warehouse/offcuts/{$offcutId}", [
                'status' => 'consumed',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => OffcutStatus::Consumed->value]);

        $this->assertSame(
            OffcutStatus::Consumed,
            OffcutPiece::query()->findOrFail($offcutId)->status
        );
    }

    public function test_operations_manager_can_reorder_fifo_reservations(): void
    {
        $user = $this->operationsManager();
        $projectA = $this->createTestProject(['reference' => 'PRJ-FIFO-A']);
        $projectB = $this->createTestProject(['reference' => 'PRJ-FIFO-B']);
        $item = $this->itemBySku('ACC-HNG-001');

        foreach ([$projectA, $projectB] as $project) {
            $this->actingAsSanctum($user)
                ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                    'emit_events' => false,
                    'lines' => [['item_id' => $item->id, 'quantity' => 1]],
                ])
                ->assertOk();
        }

        $first = StockReservation::query()->where('project_id', $projectA->id)->firstOrFail();
        $second = StockReservation::query()->where('project_id', $projectB->id)->firstOrFail();

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/reservations/reorder', [
                'reservation_ids' => [$second->id, $first->id],
            ])
            ->assertOk()
            ->assertJsonFragment(['success' => true]);

        $this->assertSame(1, $second->fresh()->fifo_sequence);
        $this->assertSame(2, $first->fresh()->fifo_sequence);
    }

    public function test_rubber_suggest_returns_compatible_skus_for_profile(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $profile = $this->itemBySku('PROF-SLD-80MM');

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/master-data/rubbers/suggest?warehouse_item_id='.$profile->id)
            ->assertOk();

        $this->assertNotEmpty($response->json('data'));
    }

    public function test_inventory_search_locations_returns_path(): void
    {
        $user = $this->warehouseAccessoriesManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory/search/locations?q=ACC-HNG')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_offcut_analytics_returns_reuse_summary(): void
    {
        $user = $this->warehouseAluminiumManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/offcuts/analytics')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'period',
                    'summary' => [
                        'pieces_logged',
                        'pieces_consumed',
                        'reuse_rate_percent',
                    ],
                    'by_project',
                ],
            ]);
    }
}
