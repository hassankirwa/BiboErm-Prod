<?php

namespace Tests\Feature\Warehouse;

use App\Enums\ProjectStage;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockReservation;
use App\Services\Projects\ProjectStageService;

class WarehouseReservationsTest extends WarehouseFeatureTestCase
{
    public function test_stock_check_reports_availability(): void
    {
        $user = $this->warehouseAluminiumManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('PROF-SLD-80MM');

        $response = $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/stock-check", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 10,
                    'bom_line_ref' => 'BOM-001',
                ]],
            ])
            ->assertOk();

        $payload = $response->json();

        $this->assertTrue($payload['can_fully_reserve']);
        $this->assertSame($project->id, $payload['project_id']);
        $this->assertSame('PROF-SLD-80MM', $payload['lines'][0]['sku']);
    }

    public function test_stock_check_detects_shortage(): void
    {
        $user = $this->warehouseAluminiumManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('PROF-SLD-80MM');

        $response = $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/stock-check", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 99999,
                ]],
            ])
            ->assertOk();

        $this->assertFalse($response->json('can_fully_reserve'));
        $this->assertGreaterThan(0, (float) $response->json('lines.0.shortage'));
    }

    public function test_reserve_creates_fifo_reservation_and_reserved_qty(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $beforeReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $response = $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'notes' => 'BOM confirmed',
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 8,
                    'bom_line_ref' => 'BOM-HNG-1',
                ]],
            ])
            ->assertOk()
            ->assertJsonFragment(['success' => true]);

        $reservationId = $response->json('reservation.id');

        $this->assertNotNull($reservationId);

        $reservation = StockReservation::query()->findOrFail($reservationId);

        $this->assertSame(ReservationStatus::Pending, $reservation->status);
        $this->assertSame($project->id, $reservation->project_id);
        $this->assertSame(1, $reservation->fifo_sequence);

        $afterReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->assertSame(
            bcadd((string) $beforeReserved, '8', 3),
            (string) $afterReserved
        );
    }

    public function test_reserve_rejects_partial_when_shortage_exists(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 99999,
                ]],
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'success' => false,
                'message' => 'Material shortage detected — partial reservation not allowed.',
            ]);
    }

    public function test_release_consumes_reserved_and_on_hand_stock(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HDL-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN1');

        $reserveResponse = $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 6,
                ]],
            ])
            ->assertOk();

        $reservationId = $reserveResponse->json('reservation.id');

        $beforeOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $beforeReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/reservations/{$reservationId}/release")
            ->assertOk()
            ->assertJsonFragment(['status' => ReservationStatus::Released->value]);

        $afterOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $afterReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->assertSame(bcsub((string) $beforeOnHand, '6', 3), (string) $afterOnHand);
        $this->assertSame(bcsub((string) $beforeReserved, '6', 3), (string) $afterReserved);
    }

    public function test_reservations_index_lists_created_reservations(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 2,
                ]],
            ])
            ->assertOk();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/reservations')
            ->assertOk()
            ->assertJsonFragment(['project_id' => $project->id]);
    }

    public function test_procurement_officer_cannot_create_reservations(): void
    {
        $user = $this->procurementOfficer();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertForbidden();
    }

    public function test_production_manager_cannot_create_reservations(): void
    {
        $user = $this->productionManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 1,
                ]],
            ])
            ->assertForbidden();
    }

    public function test_release_project_materials_subtracts_stock_with_received_by(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialsReady->value]);
        $item = $this->itemBySku('ACC-HDL-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN1');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 4,
                ]],
            ])
            ->assertOk();

        app(ProjectStageService::class)->initialize($project->fresh(), $manager);

        $beforeOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $beforeReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/release-materials", [
                'received_by' => $releaser->id,
                'notes' => 'Handoff to cutting',
            ])
            ->assertOk()
            ->assertJsonPath('data.project_stage', ProjectStage::MaterialsReleased->value)
            ->assertJsonPath('data.reservation.status', ReservationStatus::Released->value)
            ->assertJsonPath('data.reservation.received_by', $releaser->id);

        $afterOnHand = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $afterReserved = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->assertSame(bcsub((string) $beforeOnHand, '4', 3), (string) $afterOnHand);
        $this->assertSame(bcsub((string) $beforeReserved, '4', 3), (string) $afterReserved);
        $this->assertSame(
            ProjectStage::MaterialsReleased,
            $project->fresh()->stage,
        );
    }

    public function test_release_project_materials_requires_received_by(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialsReady->value]);
        $item = $this->itemBySku('ACC-HDL-001');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 2,
                ]],
            ])
            ->assertOk();

        app(ProjectStageService::class)->initialize($project->fresh(), $manager);

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/release-materials", [
                'notes' => 'Missing receiver',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['received_by']);
    }

    public function test_reserve_tops_up_existing_reservation_without_double_holding(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 4,
                    'bom_line_ref' => 'BOM-HNG-1',
                ]],
            ])
            ->assertOk();

        $afterFirst = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $reservationId = StockReservation::query()->where('project_id', $project->id)->value('id');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 10,
                    'bom_line_ref' => 'BOM-HNG-1',
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('reservation.id', $reservationId)
            ->assertJsonPath('topped_up', true);

        $afterTopUp = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->assertSame(bcadd($afterFirst, '6', 3), $afterTopUp);

        $held = StockReservation::query()
            ->with('lines')
            ->findOrFail($reservationId)
            ->lines
            ->sum(fn ($line) => (float) $line->remainingQuantity());

        $this->assertEqualsWithDelta(10.0, $held, 0.001);
    }

    public function test_manual_adjust_increases_and_decreases_held_quantity(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 5,
                    'bom_line_ref' => 'BOM-HNG-1',
                ]],
            ])
            ->assertOk();

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reservations/adjust", [
                'item_id' => $item->id,
                'quantity_reserved' => 8,
                'bom_line_ref' => 'BOM-HNG-1',
                'notes' => 'Manual bump',
            ])
            ->assertOk()
            ->assertJsonPath('previous_qty', '5.000')
            ->assertJsonPath('quantity_reserved', '8.000');

        $afterIncrease = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reservations/adjust", [
                'item_id' => $item->id,
                'quantity_reserved' => 3,
                'bom_line_ref' => 'BOM-HNG-1',
            ])
            ->assertOk()
            ->assertJsonPath('previous_qty', '8.000')
            ->assertJsonPath('quantity_reserved', '3.000');

        $afterDecrease = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        $this->assertSame(bcsub($afterIncrease, '5', 3), $afterDecrease);

        $onHandUnchanged = StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->assertGreaterThan(0, (float) $onHandUnchanged);
    }

    public function test_reserve_packs_metre_rubber_seal_cuts_to_exact_metres(): void
    {
        $user = $this->operationsManager();
        $project = $this->createTestProject();

        $item = \App\Models\Warehouse\Item::query()->create([
            'sku' => 'PY35-TEST-'.uniqid(),
            'name' => 'Inter seal',
            'category' => \App\Enums\Warehouse\ItemCategory::Rubber->value,
            'unit_of_measure' => 'metre',
        ]);

        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN2');
        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 24,
            'quantity_reserved' => 0,
        ]);

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [
                    ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 1767, 'bom_line_ref' => '64'],
                    ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 2041, 'bom_line_ref' => '79'],
                    ['item_id' => $item->id, 'quantity' => 1, 'required_length_mm' => 1791, 'bom_line_ref' => '91'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $held = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_reserved');

        // Exact sum of cuts: 5.599m (not a full 6m bar).
        $this->assertSame('5.599', $held);
    }

    public function test_stock_check_shortage_uses_remaining_gap_after_partial_hold(): void
    {
        $user = $this->warehouseAluminiumManager();
        $project = $this->createTestProject();
        $item = $this->itemBySku('ACC-HNG-001');

        $this->actingAsSanctum($this->operationsManager())
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 4,
                    'bom_line_ref' => 'BOM-HNG-1',
                ]],
            ])
            ->assertOk();

        $response = $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/stock-check", [
                'lines' => [[
                    'item_id' => $item->id,
                    'quantity' => 10,
                    'bom_line_ref' => 'BOM-HNG-1',
                ]],
            ])
            ->assertOk();

        $this->assertTrue($response->json('can_fully_reserve'));
        $this->assertSame('4.000', $response->json('lines.0.already_held'));
        $this->assertSame('6.000', $response->json('lines.0.still_needed'));
        $this->assertSame('0.000', $response->json('lines.0.shortage'));
    }
}
