<?php

namespace Tests\Feature\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Events\Production\ProductionStageCompleted;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Listeners\Production\CreateProductionOrder;
use App\Listeners\Projects\OnProductionStageCompleted;
use App\Listeners\Projects\OnProjectMaterialsReady;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\OffcutPiece;
use App\Services\Production\ProductionOrderService;
use App\Services\Warehouse\Offcuts\OffcutLoggingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProductionFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['production.view', 'production.manage', 'production.schedule.manage'] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->manager = User::factory()->create();
        $this->manager->givePermissionTo([
            'production.view',
            'production.manage',
            'production.schedule.manage',
        ]);
    }

    public function test_project_materials_ready_creates_production_order(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReserved);

        (new OnProjectMaterialsReady(app(\App\Services\Projects\ProjectStageService::class)))
            ->handle(new ProjectMaterialsReady($project->id, 1, 42));

        (new CreateProductionOrder(app(ProductionOrderService::class)))
            ->handle(new ProjectMaterialsReady($project->id, 1, 42));

        $order = ProductionOrder::query()->where('project_id', $project->id)->first();

        $this->assertNotNull($order);
        $this->assertSame(42, $order->fifo_position);
        $this->assertSame(ProductionOrderStatus::Scheduled, $order->status);
        $this->assertSame(ProductionStage::MaterialPrep, $order->current_stage);
        $this->assertStringStartsWith('PROD-', $order->reference);
    }

    public function test_does_not_create_order_when_project_not_materials_ready(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::BomFinalized);

        (new CreateProductionOrder(app(ProductionOrderService::class)))
            ->handle(new ProjectMaterialsReady($project->id, 1, 5));

        $this->assertDatabaseMissing('production_orders', ['project_id' => $project->id]);
    }

    public function test_only_one_active_order_per_project(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $service = app(ProductionOrderService::class);

        $first = $service->createFromMaterialsReady($project->id, 1);
        $second = $service->createFromMaterialsReady($project->id, 2);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertSame(1, ProductionOrder::query()->where('project_id', $project->id)->count());
    }

    public function test_orders_list_sorted_by_fifo_position(): void
    {
        $projectA = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $projectB = $this->createProjectAtStage(ProjectStage::MaterialsReady);

        app(ProductionOrderService::class)->createFromMaterialsReady($projectA->id, 20);
        app(ProductionOrderService::class)->createFromMaterialsReady($projectB->id, 5);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/production/orders');

        $response->assertOk();
        $positions = collect($response->json('data'))->pluck('fifo_position')->all();
        $this->assertSame([5, 20], $positions);
    }

    public function test_schedule_patch_updates_dates_not_fifo(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $order = app(ProductionOrderService::class)->createFromMaterialsReady($project->id, 10);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/schedule", [
                'scheduled_start' => '2026-06-10',
                'scheduled_end' => '2026-06-20',
                'fifo_position' => 999,
            ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['fifo_position']);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/schedule", [
                'scheduled_start' => '2026-06-10',
                'scheduled_end' => '2026-06-20',
            ])
            ->assertOk();

        $order->refresh();
        $this->assertSame('2026-06-10', $order->scheduled_start->toDateString());
        $this->assertSame(10, $order->fifo_position);
    }

    public function test_complete_cutting_without_offcuts_returns_validation_error(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'cutting',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['offcuts']);
    }

    public function test_complete_cutting_dispatches_production_stage_completed_with_user(): void
    {
        Event::fake([ProductionStageCompleted::class]);

        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);

        $this->mock(OffcutLoggingService::class)
            ->shouldReceive('logFromArray')
            ->once()
            ->andReturn(new OffcutPiece(['id' => 99]));

        app(\App\Services\Production\ProductionStageService::class)->complete(
            order: $order,
            stage: ProductionStage::Cutting,
            user: $this->manager,
            offcuts: [
                ['item_id' => 1, 'length_mm' => 500],
            ],
        );

        Event::assertDispatched(ProductionStageCompleted::class, function (ProductionStageCompleted $event) use ($order) {
            return $event->projectId === $order->project_id
                && $event->productionOrderId === $order->id
                && $event->productionStage === 'cutting'
                && $event->completedByUserId === $this->manager->id;
        });
    }

    public function test_cutting_sheet_line_can_be_updated_with_reason(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting);

        $line = \App\Models\Production\CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => 1,
            'profile_code' => 'ALU-001',
            'cut_length_mm' => 1200,
            'pieces' => 2,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/cutting-sheet/{$line->id}", [
                'cut_length_mm' => 1180,
                'pieces' => 3,
                'reason' => 'Shop floor remeasure',
            ])
            ->assertOk();

        $line->refresh();
        $this->assertSame(1180, $line->cut_length_mm);
        $this->assertSame(3, $line->pieces);
    }

    public function test_assigned_to_me_filter_limits_orders_for_team_members(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $order = app(ProductionOrderService::class)->createFromMaterialsReady($project->id, 1);

        $teamMember = User::factory()->create();
        $teamMember->givePermissionTo(['production.view', 'production.manage']);

        \App\Models\Production\ProductionOrderTeam::query()->create([
            'production_order_id' => $order->id,
            'user_id' => $teamMember->id,
            'stage' => ProductionStage::Cutting->value,
            'role' => 'cutting_lead',
            'assigned_at' => now(),
            'assigned_by' => $this->manager->id,
        ]);

        $otherProject = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        app(ProductionOrderService::class)->createFromMaterialsReady($otherProject->id, 2);

        $response = $this->actingAs($teamMember, 'sanctum')
            ->getJson('/api/v1/production/orders?assigned_to_me=1');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($order->id, $response->json('data.0.id'));
    }

    public function test_pm_sync_on_cutting_complete(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $order = app(ProductionOrderService::class)->createFromMaterialsReady($project->id, 1);
        $project->update(['stage' => ProjectStage::MaterialsReady]);

        $listener = app(OnProductionStageCompleted::class);
        $listener->handle(new ProductionStageCompleted(
            projectId: $project->id,
            productionOrderId: $order->id,
            productionStage: 'cutting',
        ));

        $this->assertSame(ProjectStage::CuttingStage, $project->fresh()->stage);
    }

    public function test_start_stage_cutting_records_material_release(): void
    {
        $order = $this->createOrderInStage(ProductionStage::MaterialPrep);

        $reservation = \App\Models\Warehouse\StockReservation::query()->create([
            'reservation_number' => 'RSV-TEST-001',
            'project_id' => $order->project_id,
            'status' => \App\Enums\Warehouse\ReservationStatus::Pending,
            'reserved_at' => now(),
            'reserved_by' => $this->manager->id,
            'fifo_sequence' => 1,
        ]);

        $item = \App\Models\Warehouse\Item::query()->create([
            'sku' => 'ALU-TEST',
            'name' => 'Test Profile',
            'category' => \App\Enums\Warehouse\ItemCategory::AluminiumProfile,
            'unit_of_measure' => 'm',
            'is_active' => true,
        ]);

        $binId = $this->createWarehouseBin();

        $line = \App\Models\Warehouse\StockReservationLine::query()->create([
            'reservation_id' => $reservation->id,
            'item_id' => $item->id,
            'bin_id' => $binId,
            'quantity_reserved' => '10.000',
            'quantity_released' => '0',
        ]);

        $this->mock(\App\Services\Warehouse\Reservations\StageMaterialReleaseService::class)
            ->shouldReceive('releaseForStage')
            ->once()
            ->andReturnUsing(function () use ($reservation, $line) {
                $line->update(['quantity_released' => '5.000']);

                return ['reservation' => $reservation->fresh(), 'movement_id' => 1001];
            });

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/start-stage", [
                'stage' => 'material_prep',
            ])
            ->assertOk();

        $this->assertDatabaseHas('production_material_releases', [
            'production_order_id' => $order->id,
            'stock_reservation_line_id' => $line->id,
            'stage' => 'material_prep',
        ]);
    }

    public function test_glass_order_created_once_on_fabrication_complete(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::FabricationStage);

        app(\App\Listeners\Procurement\NotifyGlassProcurement::class)->handle(
            new ProductionStageCompleted($project->id, 1, 'fabrication')
        );
        app(\App\Listeners\Procurement\NotifyGlassProcurement::class)->handle(
            new ProductionStageCompleted($project->id, 1, 'fabrication')
        );

        $this->assertSame(
            1,
            \App\Models\Procurement\GlassOrder::query()->where('project_id', $project->id)->count()
        );
    }

    public function test_sash_complete_keeps_fabrication_stage(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::FabricationStage);

        app(OnProductionStageCompleted::class)->handle(new ProductionStageCompleted(
            projectId: $project->id,
            productionOrderId: 1,
            productionStage: 'sash',
        ));

        $this->assertSame(ProjectStage::FabricationStage, $project->fresh()->stage);
    }

    protected function createWarehouseBin(): int
    {
        $warehouseId = \Illuminate\Support\Facades\DB::table('warehouses')->insertGetId([
            'code' => 'WH-TEST',
            'name' => 'Test Warehouse',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $deckId = \Illuminate\Support\Facades\DB::table('warehouse_decks')->insertGetId([
            'warehouse_id' => $warehouseId,
            'slug' => 'aluminium',
            'name' => 'Aluminium',
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sectionId = \Illuminate\Support\Facades\DB::table('warehouse_sections')->insertGetId([
            'deck_id' => $deckId,
            'code' => 'SEC-1',
            'name' => 'Section 1',
            'section_type' => 'profile',
            'sort_order' => 0,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return (int) \Illuminate\Support\Facades\DB::table('warehouse_bins')->insertGetId([
            'section_id' => $sectionId,
            'code' => 'BIN-1',
            'sort_order' => 0,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function createProjectAtStage(ProjectStage $stage): Project
    {
        return Project::query()->create([
            'reference' => 'PRJ-TEST-'.uniqid(),
            'name' => 'Test Project',
            'stage' => $stage,
            'type' => 'residential',
            'location_type' => 'nairobi',
        ]);
    }

    protected function createOrderInStage(ProductionStage $stage, bool $started = false): ProductionOrder
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);

        $order = ProductionOrder::query()->create([
            'reference' => 'PROD-TEST-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => $stage,
            'fifo_position' => 1,
            'actual_start' => now()->toDateString(),
        ]);

        if ($started) {
            \App\Models\Production\ProductionStageLog::query()->create([
                'production_order_id' => $order->id,
                'stage' => $stage,
                'status' => 'started',
                'started_at' => now(),
            ]);
        }

        return $order;
    }
}
