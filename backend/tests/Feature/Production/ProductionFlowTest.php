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
use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\Item;
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

    public function test_sync_backfills_production_order_for_materials_ready_project(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);

        $this->assertDatabaseMissing('production_orders', ['project_id' => $project->id]);

        $created = app(ProductionOrderService::class)->syncOrdersForMaterialsReadyProjects();

        $this->assertSame(1, $created);
        $this->assertDatabaseHas('production_orders', [
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::Scheduled->value,
            'current_stage' => ProductionStage::MaterialPrep->value,
        ]);
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

    public function test_complete_cutting_without_sheet_is_rejected(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'cutting',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cutting_sheet']);
    }

    public function test_complete_cutting_requires_bar_and_waste_on_sheet(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);
        $item = $this->createAluminiumItem('ALU-CUT-INCOMPLETE');

        CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => 'ALU-CUT',
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'cutting',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cutting_sheet']);
    }

    public function test_complete_cutting_with_filled_sheet_auto_logs_waste_offcuts(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);
        $item = $this->createAluminiumItem('ALU-CUT-WASTE');

        CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => 'ALU-CUT',
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'bar_length_mm' => 6000,
            'waste_mm' => 450,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->mock(OffcutLoggingService::class)
            ->shouldReceive('logFromArray')
            ->once()
            ->withArgs(function ($user, array $data, $projectId) use ($order, $item) {
                return (int) $data['item_id'] === $item->id
                    && (int) $data['length_mm'] === 450
                    && $projectId === $order->project_id;
            })
            ->andReturn(new OffcutPiece(['id' => 99]));

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'cutting',
            ])
            ->assertOk();

        $order->refresh();
        $this->assertSame(ProductionStage::Fabrication, $order->current_stage);
    }

    public function test_complete_cutting_skips_discarded_waste_offcuts(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);
        $item = $this->createAluminiumItem('ALU-CUT-DISCARD');

        $line = CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => 'ALU-CUT',
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'bar_length_mm' => 6000,
            'waste_mm' => 50,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->mock(OffcutLoggingService::class)
            ->shouldReceive('logFromArray')
            ->never();

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'cutting',
                'discard_waste_line_ids' => [$line->id],
            ])
            ->assertOk();
    }

    public function test_material_prep_complete_requires_assignee_and_notes(): void
    {
        $order = $this->createOrderInStage(ProductionStage::MaterialPrep, started: true);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'material_prep',
                'notes' => 'Materials staged at cutting bay',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assignee']);

        \App\Models\Production\ProductionOrderTeam::query()->create([
            'production_order_id' => $order->id,
            'user_id' => $this->manager->id,
            'stage' => ProductionStage::MaterialPrep->value,
            'role' => 'cutting_lead',
            'assigned_at' => now(),
            'assigned_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'material_prep',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['notes']);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'material_prep',
                'notes' => 'Materials staged at cutting bay',
            ])
            ->assertOk();

        $order->refresh();
        $this->assertSame(ProductionStage::Cutting, $order->current_stage);

        $log = $order->stageLogs()->where('stage', 'material_prep')->where('status', 'completed')->first();
        $this->assertNotNull($log);
        $this->assertSame('Materials staged at cutting bay', $log->notes);
    }

    public function test_material_prep_complete_accepts_optional_evidence_photo(): void
    {
        $order = $this->createOrderInStage(ProductionStage::MaterialPrep, started: true);

        \App\Models\Production\ProductionOrderTeam::query()->create([
            'production_order_id' => $order->id,
            'user_id' => $this->manager->id,
            'stage' => ProductionStage::MaterialPrep->value,
            'role' => 'cutting_lead',
            'assigned_at' => now(),
            'assigned_by' => $this->manager->id,
        ]);

        $photo = \Illuminate\Http\UploadedFile::fake()->image('prep-evidence.jpg', 400, 300);

        $this->actingAs($this->manager, 'sanctum')
            ->post("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'material_prep',
                'notes' => 'Prep complete with photo',
                'evidence' => $photo,
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $log = \App\Models\Production\ProductionStageLog::query()
            ->where('production_order_id', $order->id)
            ->where('stage', 'material_prep')
            ->where('status', 'completed')
            ->first();

        $this->assertNotNull($log);
        $this->assertNotNull($log->evidence_path);
        $this->assertStringContainsString('production-stage-evidence', $log->evidence_path);
    }

    public function test_fabrication_complete_requires_notes_and_accepts_photos(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Fabrication, started: true);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'fabrication',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['notes']);

        $photos = [
            \Illuminate\Http\UploadedFile::fake()->image('fab-1.jpg', 400, 300),
            \Illuminate\Http\UploadedFile::fake()->image('fab-2.jpg', 400, 300),
        ];

        $this->actingAs($this->manager, 'sanctum')
            ->post("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'fabrication',
                'notes' => 'Frame welded and checked',
                'evidence' => $photos,
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $log = \App\Models\Production\ProductionStageLog::query()
            ->where('production_order_id', $order->id)
            ->where('stage', 'fabrication')
            ->where('status', 'completed')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame('Frame welded and checked', $log->notes);
        $paths = $log->evidencePaths();
        $this->assertCount(2, $paths);
        $this->assertSame(ProductionStage::Sash, $order->fresh()->current_stage);
    }

    public function test_complete_cutting_dispatches_production_stage_completed_with_user(): void
    {
        Event::fake([ProductionStageCompleted::class]);

        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);
        $item = $this->createAluminiumItem('ALU-EVT');
        $this->attachReadyCuttingSheet($order, $item, wasteMm: 500);

        $this->mock(OffcutLoggingService::class)
            ->shouldReceive('logFromArray')
            ->once()
            ->andReturn(new OffcutPiece(['id' => 99]));

        app(\App\Services\Production\ProductionStageService::class)->complete(
            order: $order,
            stage: ProductionStage::Cutting,
            user: $this->manager,
            offcuts: [
                ['item_id' => $item->id, 'length_mm' => 500],
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
            ->assertOk()
            ->assertJsonPath('data.expected_bar_length_mm', 6000)
            ->assertJsonPath('data.needed_mm', 3540);

        $line->refresh();
        $this->assertSame(1180, $line->cut_length_mm);
        $this->assertSame(3, $line->pieces);
    }

    public function test_cutting_sheet_line_can_be_updated_without_reason(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting);
        $item = $this->createAluminiumItem('ALU-CUT-NO-REASON');

        $line = CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => 'ALU-CUT',
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/cutting-sheet/{$line->id}", [
                'bar_length_mm' => 6000,
                'waste_mm' => 4800,
            ])
            ->assertOk()
            ->assertJsonPath('data.bar_length_mm', 6000)
            ->assertJsonPath('data.waste_mm', 4800);
    }

    public function test_cutting_sheet_rejects_cut_longer_than_bar(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting);
        $item = $this->createAluminiumItem('ALU-CUT-OVERSIZE');

        $line = CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => 'ALU-CUT',
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/cutting-sheet/{$line->id}", [
                'cut_length_mm' => 6500,
                'bar_length_mm' => 6000,
                'waste_mm' => 0,
                'reason' => 'Too long for bar',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bar_length_mm']);
    }

    public function test_complete_cutting_rejects_waste_longer_than_bar(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);
        $item = $this->createAluminiumItem('ALU-CUT-WASTE-OVER');

        CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => 'ALU-CUT',
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'bar_length_mm' => 6000,
            'waste_mm' => 7000,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/complete-stage", [
                'stage' => 'cutting',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cutting_sheet']);
    }

    public function test_assigned_to_me_filter_limits_orders_for_team_members(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $order = app(ProductionOrderService::class)->createFromMaterialsReady($project->id, 1);

        $teamMember = User::factory()->create();
        $teamMember->givePermissionTo(['production.view']);

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
        $order = $this->createOrderInStage(ProductionStage::Cutting);
        Project::query()->whereKey($order->project_id)->update([
            'stage' => ProjectStage::MaterialsReleased,
        ]);

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
                'stage' => 'cutting',
            ])
            ->assertOk();

        $this->assertDatabaseHas('production_material_releases', [
            'production_order_id' => $order->id,
            'stock_reservation_line_id' => $line->id,
            'stage' => 'cutting',
        ]);
    }

    public function test_start_stage_rejects_fetch_when_materials_not_staged(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting);
        Project::query()->whereKey($order->project_id)->update([
            'stage' => ProjectStage::MaterialsReady,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/start-stage", [
                'stage' => 'cutting',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['materials']);
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

    public function test_schedule_endpoint_returns_fifo_sorted_orders(): void
    {
        $projectA = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $projectB = $this->createProjectAtStage(ProjectStage::MaterialsReady);

        app(ProductionOrderService::class)->createFromMaterialsReady($projectA->id, 30);
        app(ProductionOrderService::class)->createFromMaterialsReady($projectB->id, 5);

        $response = $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/production/schedule');

        $response->assertOk();
        $positions = collect($response->json('data'))->pluck('fifo_position')->all();
        $this->assertSame([5, 30], $positions);
    }

    public function test_offcuts_proxy_logs_offcut_during_cutting(): void
    {
        $order = $this->createOrderInStage(ProductionStage::Cutting, started: true);

        $item = \App\Models\Warehouse\Item::query()->create([
            'sku' => 'ALU-OFFCUT',
            'name' => 'Offcut Profile',
            'category' => \App\Enums\Warehouse\ItemCategory::AluminiumProfile,
            'unit_of_measure' => 'm',
            'is_active' => true,
        ]);

        $this->mock(OffcutLoggingService::class)
            ->shouldReceive('logFromArray')
            ->once()
            ->andReturn(new OffcutPiece(['id' => 1, 'item_id' => $item->id]));

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/offcuts", [
                'offcuts' => [
                    ['item_id' => $item->id, 'length_mm' => 400],
                ],
            ])
            ->assertOk();
    }

    public function test_qc_pre_check_complete_dispatches_production_stage_completed(): void
    {
        Event::fake([ProductionStageCompleted::class]);

        $order = $this->createOrderInStage(ProductionStage::QcPreCheck, started: true);

        app(\App\Services\Production\ProductionStageService::class)->complete(
            order: $order,
            stage: ProductionStage::QcPreCheck,
            user: $this->manager,
        );

        Event::assertDispatched(ProductionStageCompleted::class, function (ProductionStageCompleted $event) use ($order) {
            return $event->productionStage === 'qc_pre_check'
                && $event->productionOrderId === $order->id;
        });
    }

    public function test_qc_post_fabrication_complete_advances_project_stage(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::GlassAssembly);
        $order = ProductionOrder::query()->create([
            'reference' => 'PROD-QC-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::QcPostFabrication,
            'fifo_position' => 1,
            'actual_start' => now()->toDateString(),
        ]);

        \App\Models\Production\ProductionStageLog::query()->create([
            'production_order_id' => $order->id,
            'stage' => ProductionStage::QcPostFabrication,
            'status' => 'started',
            'started_at' => now(),
        ]);

        app(OnProductionStageCompleted::class)->handle(new ProductionStageCompleted(
            projectId: $project->id,
            productionOrderId: $order->id,
            productionStage: 'qc_post_fabrication',
        ));

        $this->assertSame(ProjectStage::QcPreInstallation, $project->fresh()->stage);
    }

    public function test_order_status_can_be_set_to_on_hold(): void
    {
        $project = $this->createProjectAtStage(ProjectStage::MaterialsReady);
        $order = app(ProductionOrderService::class)->createFromMaterialsReady($project->id, 1);

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/status", [
                'status' => 'on_hold',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'on_hold');

        $this->actingAs($this->manager, 'sanctum')
            ->patchJson("/api/v1/production/orders/{$order->id}/status", [
                'status' => 'in_progress',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');
    }

    public function test_start_glass_assembly_rejected_when_no_glass_on_bom(): void
    {
        $order = $this->createOrderInStage(ProductionStage::GlassAssembly);
        $this->createProjectBom($order->project_id, withGlass: false);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/start-stage", [
                'stage' => 'glass_assembly',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['glass']);
    }

    public function test_start_glass_assembly_rejected_when_glass_not_delivered(): void
    {
        $order = $this->createOrderInStage(ProductionStage::GlassAssembly);
        $this->createProjectBom($order->project_id, withGlass: true);
        $this->createGlassOrder($order->project_id, \App\Enums\Procurement\GlassOrderStatus::Ordered);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/start-stage", [
                'stage' => 'glass_assembly',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['glass']);
    }

    public function test_skip_qc_pre_check_advances_to_cutting(): void
    {
        $order = $this->createOrderInStage(ProductionStage::QcPreCheck);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/skip-stage", [
                'stage' => 'qc_pre_check',
                'notes' => 'Inspect after assembly',
            ])
            ->assertOk()
            ->assertJsonPath('data.current_stage', 'cutting');

        $this->assertDatabaseHas('production_stage_logs', [
            'production_order_id' => $order->id,
            'stage' => 'qc_pre_check',
            'status' => 'skipped',
        ]);
    }

    public function test_skip_glass_assembly_advances_to_finishing_when_no_glass(): void
    {
        $order = $this->createOrderInStage(ProductionStage::GlassAssembly);
        $this->createProjectBom($order->project_id, withGlass: false);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/skip-stage", [
                'stage' => 'glass_assembly',
            ])
            ->assertOk()
            ->assertJsonPath('data.current_stage', 'finishing');

        $this->assertDatabaseHas('production_stage_logs', [
            'production_order_id' => $order->id,
            'stage' => 'glass_assembly',
            'status' => 'skipped',
        ]);
    }

    public function test_skip_glass_assembly_rejected_when_glass_required(): void
    {
        $order = $this->createOrderInStage(ProductionStage::GlassAssembly);
        $this->createProjectBom($order->project_id, withGlass: true);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/production/orders/{$order->id}/skip-stage", [
                'stage' => 'glass_assembly',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['glass']);
    }

    public function test_order_detail_includes_glass_assembly_context(): void
    {
        $order = $this->createOrderInStage(ProductionStage::GlassAssembly);
        $this->createProjectBom($order->project_id, withGlass: false);

        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/v1/production/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('data.glass_assembly.requires_glass', false)
            ->assertJsonPath('data.glass_assembly.can_skip', true)
            ->assertJsonPath('data.glass_assembly.can_start', false);
    }

    protected function createAluminiumItem(string $sku): Item
    {
        return Item::query()->create([
            'sku' => $sku,
            'name' => 'Aluminium '.$sku,
            'category' => \App\Enums\Warehouse\ItemCategory::AluminiumProfile,
            'unit_of_measure' => 'm',
            'is_active' => true,
        ]);
    }

    protected function attachReadyCuttingSheet(
        ProductionOrder $order,
        Item $item,
        int $wasteMm = 400,
        int $barLengthMm = 6000,
    ): CuttingSheet {
        return CuttingSheet::query()->create([
            'production_order_id' => $order->id,
            'project_bom_line_id' => 1,
            'warehouse_item_id' => $item->id,
            'profile_code' => $item->sku,
            'cut_length_mm' => 1200,
            'pieces' => 1,
            'bar_length_mm' => $barLengthMm,
            'waste_mm' => $wasteMm,
            'sort_order' => 0,
            'generated_at' => now(),
            'generated_by' => $this->manager->id,
        ]);
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

    protected function createProjectBom(int $projectId, bool $withGlass): \App\Models\ProjectBom
    {
        $bom = \App\Models\ProjectBom::query()->create([
            'project_id' => $projectId,
            'version' => 1,
            'status' => 'finalized',
        ]);

        \App\Models\ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'accessory',
            'material_code' => 'ACC-001',
            'material_name' => 'Handle Set',
            'quantity' => 1,
            'is_glass' => false,
            'sort_order' => 1,
        ]);

        if ($withGlass) {
            \App\Models\ProjectBomLine::query()->create([
                'bom_id' => $bom->id,
                'line_type' => 'glass',
                'material_code' => 'GLS-001',
                'material_name' => '6mm Clear Tempered',
                'quantity' => 2,
                'is_procurement_only' => true,
                'is_glass' => true,
                'sort_order' => 2,
            ]);
        }

        return $bom;
    }

    protected function createGlassOrder(int $projectId, \App\Enums\Procurement\GlassOrderStatus $status): void
    {
        \App\Models\Procurement\GlassOrder::query()->create([
            'order_number' => 'GLS-'.uniqid(),
            'project_id' => $projectId,
            'specs' => ['source' => 'test'],
            'status' => $status,
            'created_by' => $this->manager->id,
        ]);
    }
}
