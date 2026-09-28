<?php

namespace Tests\Feature\Warehouse;

use App\Enums\ProjectStage;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Warehouse\MaterialReleaseBatch;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\StockReservation;
use App\Services\Projects\ProjectStageService;

class MaterialReleaseChecklistTest extends WarehouseFeatureTestCase
{
    public function test_partial_checklist_release_holds_accessories_and_decrements_only_selected(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialsReady->value]);

        $aluminium = $this->itemBySku('PROF-SLD-80MM');
        $accessory = $this->itemBySku('ACC-HDL-001');
        $accBin = $this->binBySectionAndCode('SEC-SLD', 'BIN1');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [
                    ['item_id' => $aluminium->id, 'quantity' => 5],
                    ['item_id' => $accessory->id, 'quantity' => 4],
                ],
            ])
            ->assertOk();

        app(ProjectStageService::class)->initialize($project->fresh(), $manager);

        $reservation = StockReservation::query()
            ->with('lines')
            ->where('project_id', $project->id)
            ->latest('id')
            ->firstOrFail();

        $aluReserved = $reservation->lines
            ->where('item_id', $aluminium->id)
            ->sum(fn ($line) => (float) $line->remainingQuantity());
        $this->assertGreaterThan(0, $aluReserved);

        $aluOnHandBefore = (string) StockLevel::query()
            ->where('item_id', $aluminium->id)
            ->sum('quantity_on_hand');
        $accOnHandBefore = (string) StockLevel::query()
            ->where('item_id', $accessory->id)
            ->where('bin_id', $accBin->id)
            ->value('quantity_on_hand');

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/release-materials", [
                'received_by' => $releaser->id,
                'notes' => 'Aluminium for cutting',
                'lines' => [
                    // Omit quantity → release all remaining for this SKU only.
                    ['item_id' => $aluminium->id],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.is_partial', true)
            ->assertJsonPath('data.reservation.status', ReservationStatus::Partial->value)
            ->assertJsonPath('data.project_stage', ProjectStage::MaterialsReleased->value);

        $this->assertSame(
            bcsub($aluOnHandBefore, number_format($aluReserved, 3, '.', ''), 3),
            bcadd((string) StockLevel::query()
                ->where('item_id', $aluminium->id)
                ->sum('quantity_on_hand'), '0', 3),
        );
        $this->assertSame(
            $accOnHandBefore,
            (string) StockLevel::query()
                ->where('item_id', $accessory->id)
                ->where('bin_id', $accBin->id)
                ->value('quantity_on_hand'),
        );

        $reservation->refresh()->load('lines');
        $aluRemaining = $reservation->lines
            ->where('item_id', $aluminium->id)
            ->sum(fn ($line) => (float) $line->remainingQuantity());
        $accRemaining = $reservation->lines
            ->where('item_id', $accessory->id)
            ->sum(fn ($line) => (float) $line->remainingQuantity());

        $this->assertEqualsWithDelta(0.0, $aluRemaining, 0.001);
        $this->assertEqualsWithDelta(4.0, $accRemaining, 0.001);

        $this->assertSame(1, MaterialReleaseBatch::query()->where('project_id', $project->id)->count());
        $this->assertTrue(
            (bool) MaterialReleaseBatch::query()->where('project_id', $project->id)->value('is_partial')
        );
    }

    public function test_second_checklist_batch_releases_remaining_accessories(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialsReady->value]);

        $aluminium = $this->itemBySku('PROF-SLD-80MM');
        $accessory = $this->itemBySku('ACC-HDL-001');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [
                    ['item_id' => $aluminium->id, 'quantity' => 3],
                    ['item_id' => $accessory->id, 'quantity' => 2],
                ],
            ])
            ->assertOk();

        app(ProjectStageService::class)->initialize($project->fresh(), $manager);

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/release-materials", [
                'received_by' => $releaser->id,
                'lines' => [['item_id' => $aluminium->id]],
            ])
            ->assertOk()
            ->assertJsonPath('data.is_partial', true);

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/release-materials", [
                'received_by' => $releaser->id,
                'notes' => 'Accessories for fab',
                'lines' => [['item_id' => $accessory->id, 'quantity' => 2]],
            ])
            ->assertOk()
            ->assertJsonPath('data.is_partial', false)
            ->assertJsonPath('data.reservation.status', ReservationStatus::Released->value);

        $this->assertSame(2, MaterialReleaseBatch::query()->where('project_id', $project->id)->count());
        $this->assertSame(
            ProjectStage::MaterialsReleased,
            $project->fresh()->stage,
        );
    }

    public function test_full_release_without_lines_still_works(): void
    {
        $manager = $this->operationsManager();
        $releaser = $this->productionManager();
        $project = $this->createTestProject(['stage' => ProjectStage::MaterialsReady->value]);
        $item = $this->itemBySku('ACC-HDL-001');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN1');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/reserve", [
                'lines' => [['item_id' => $item->id, 'quantity' => 3]],
            ])
            ->assertOk();

        app(ProjectStageService::class)->initialize($project->fresh(), $manager);

        $before = (string) StockLevel::query()
            ->where('item_id', $item->id)
            ->where('bin_id', $bin->id)
            ->value('quantity_on_hand');

        $this->actingAsSanctum($releaser)
            ->postJson("/api/v1/warehouse/projects/{$project->id}/release-materials", [
                'received_by' => $releaser->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_partial', false)
            ->assertJsonPath('data.reservation.status', ReservationStatus::Released->value);

        $this->assertSame(
            bcsub($before, '3.000', 3),
            (string) StockLevel::query()
                ->where('item_id', $item->id)
                ->where('bin_id', $bin->id)
                ->value('quantity_on_hand'),
        );
    }
}
