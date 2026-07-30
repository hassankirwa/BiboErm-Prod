<?php

namespace Tests\Feature\Projects;

use App\Enums\Procurement\GlassOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Enums\ProjectStage;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Listeners\Projects\OnProjectMaterialsReady;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Models\Warehouse\Warehouse;
use App\Services\Projects\ProjectMaterialStatusService;
use App\Services\Projects\ProjectStageService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdvanceToMaterialsReadyGateTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
        ]);

        $this->user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->user->givePermissionTo([
            'projects.view',
            'projects.advance_stage_warehouse',
        ]);
    }

    public function test_cannot_advance_to_materials_ready_with_shortage_lines(): void
    {
        $project = $this->makeProjectWithBomLine(required: 5, reserved: 2);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::MaterialsReady->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['materials']);
    }

    public function test_cannot_advance_when_stock_reserved_only_for_another_project(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::MaterialsReserved->value]);
        $other = $this->makeProject(['stage' => ProjectStage::MaterialsReserved->value]);

        $item = $this->makeItem('ALU-OTHER');
        $bin = $this->makeBin();
        $bom = $this->makeBom($project);
        $line = $this->makeBomLine($bom, $item, 4);

        // Reserve for the other project only — this project has zero reserved.
        $reservation = StockReservation::query()->create([
            'reservation_number' => 'RSV-OTHER',
            'project_id' => $other->id,
            'status' => ReservationStatus::Pending->value,
            'reserved_at' => now(),
            'reserved_by' => $this->user->id,
            'fifo_sequence' => 1,
        ]);

        StockReservationLine::query()->create([
            'reservation_id' => $reservation->id,
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'quantity_reserved' => 4,
            'quantity_released' => 0,
            'bom_line_ref' => (string) $line->id,
        ]);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::MaterialsReady->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['materials']);
    }

    public function test_open_procurement_does_not_block_when_fully_reserved(): void
    {
        $project = $this->makeProjectWithBomLine(required: 2, reserved: 2);

        $item = Item::query()->where('sku', 'ALU-READY')->firstOrFail();
        $bomLine = ProjectBomLine::query()->where('bom_id', $project->latestBom->id)->firstOrFail();

        $requisition = PurchaseRequisition::query()->create([
            'reference' => 'PRQ-OPEN-1',
            'project_id' => $project->id,
            'status' => RequisitionStatus::PendingApproval->value,
            'requested_by' => $this->user->id,
        ]);

        PurchaseRequisitionLine::query()->create([
            'purchase_requisition_id' => $requisition->id,
            'warehouse_item_id' => $item->id,
            'project_bom_line_id' => $bomLine->id,
            'description' => 'Obsolete shortage PR',
            'sku' => $item->sku,
            'quantity' => 1,
            'trigger_type' => 'bom_shortage',
        ]);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::MaterialsReady->value,
        ])->assertOk();

        $this->assertSame(ProjectStage::MaterialsReady, $project->fresh()->stage);
    }

    public function test_open_procurement_blocks_when_still_short(): void
    {
        $project = $this->makeProjectWithBomLine(required: 5, reserved: 2);

        $item = Item::query()->where('sku', 'ALU-READY')->firstOrFail();
        $bomLine = ProjectBomLine::query()->where('bom_id', $project->latestBom->id)->firstOrFail();

        $requisition = PurchaseRequisition::query()->create([
            'reference' => 'PRQ-OPEN-SHORT',
            'project_id' => $project->id,
            'status' => RequisitionStatus::PendingApproval->value,
            'requested_by' => $this->user->id,
        ]);

        PurchaseRequisitionLine::query()->create([
            'purchase_requisition_id' => $requisition->id,
            'warehouse_item_id' => $item->id,
            'project_bom_line_id' => $bomLine->id,
            'description' => 'Open shortage PR',
            'sku' => $item->sku,
            'quantity' => 3,
            'trigger_type' => 'bom_shortage',
        ]);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::MaterialsReady->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['materials']);
    }

    public function test_cannot_advance_with_pending_glass_order(): void
    {
        $project = $this->makeProjectWithBomLine(required: 2, reserved: 2);

        GlassOrder::query()->create([
            'order_number' => 'GLS-PEND-1',
            'project_id' => $project->id,
            'specs' => ['thickness' => '6mm'],
            'status' => GlassOrderStatus::Ordered->value,
            'created_by' => $this->user->id,
        ]);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::MaterialsReady->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['materials']);
    }

    public function test_can_advance_when_fully_reserved_with_no_open_procurement(): void
    {
        $project = $this->makeProjectWithBomLine(required: 3, reserved: 3);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::MaterialsReady->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.stage', ProjectStage::MaterialsReady->value);
    }

    public function test_event_listener_skips_ready_when_gate_fails(): void
    {
        $project = $this->makeProjectWithBomLine(required: 5, reserved: 1);

        app(OnProjectMaterialsReady::class)->handle(new ProjectMaterialsReady(
            projectId: $project->id,
            reservationId: 10,
            fifoSequence: 1,
        ));

        $this->assertSame(
            ProjectStage::MaterialsReserved,
            app(ProjectStageService::class)->currentStage($project->fresh())
        );
    }

    public function test_assert_helper_rejects_shortages(): void
    {
        $project = $this->makeProjectWithBomLine(required: 4, reserved: 1);

        $this->expectException(ValidationException::class);

        app(ProjectMaterialStatusService::class)->assertCanAdvanceToMaterialsReady($project);
    }

    /**
     * @return Project
     */
    protected function makeProjectWithBomLine(int $required, int $reserved): Project
    {
        $project = $this->makeProject(['stage' => ProjectStage::MaterialsReserved->value]);
        $item = $this->makeItem('ALU-READY');
        $bin = $this->makeBin();
        $bom = $this->makeBom($project);
        $line = $this->makeBomLine($bom, $item, $required);

        if ($reserved > 0) {
            $reservation = StockReservation::query()->create([
                'reservation_number' => 'RSV-'.Str::upper(Str::random(6)),
                'project_id' => $project->id,
                'status' => ReservationStatus::Pending->value,
                'reserved_at' => now(),
                'reserved_by' => $this->user->id,
                'fifo_sequence' => 1,
            ]);

            StockReservationLine::query()->create([
                'reservation_id' => $reservation->id,
                'item_id' => $item->id,
                'bin_id' => $bin->id,
                'quantity_reserved' => $reserved,
                'quantity_released' => 0,
                'bom_line_ref' => (string) $line->id,
            ]);
        }

        return $project->fresh(['latestBom']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Materials Ready Gate Project',
            'stage' => ProjectStage::MaterialsReserved->value,
            'type' => 'full_install',
            'location_type' => 'nairobi',
            'is_active' => true,
            'project_manager_id' => $this->user->id,
        ], $attributes));
    }

    protected function makeBom(Project $project): ProjectBom
    {
        return ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
            'uploaded_by' => $this->user->id,
            'finalized_at' => now(),
            'finalized_by' => $this->user->id,
        ]);
    }

    protected function makeBomLine(ProjectBom $bom, Item $item, int $quantity): ProjectBomLine
    {
        return ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'aluminium_profile',
            'warehouse_item_id' => $item->id,
            'material_code' => $item->sku,
            'material_name' => $item->name,
            'quantity' => $quantity,
            'measurement_mm' => 2100,
            'sort_order' => 1,
        ]);
    }

    protected function makeItem(string $sku): Item
    {
        return Item::query()->firstOrCreate(
            ['sku' => $sku],
            [
                'name' => 'Frame Profile '.$sku,
                'category' => ItemCategory::AluminiumProfile->value,
                'unit_of_measure' => 'pcs',
            ]
        );
    }

    protected function makeBin(): Bin
    {
        $warehouse = Warehouse::query()->firstOrCreate(
            ['code' => 'MAIN-READY'],
            ['name' => 'Main Ready Warehouse']
        );

        $deck = Deck::query()->firstOrCreate(
            ['warehouse_id' => $warehouse->id, 'slug' => 'aluminium'],
            ['name' => 'Aluminium Deck']
        );

        $section = Section::query()->firstOrCreate(
            ['deck_id' => $deck->id, 'code' => 'R1'],
            ['name' => 'Section R1', 'section_type' => 'general_accessories']
        );

        return Bin::query()->firstOrCreate(
            ['section_id' => $section->id, 'code' => 'BIN-READY-01'],
            []
        );
    }
}
