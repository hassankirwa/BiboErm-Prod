<?php

namespace Tests\Feature\Projects;

use App\Enums\Procurement\GlassOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Enums\ProjectStage;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\ReservationStatus;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequisitionLine;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\StockReservationLine;
use App\Models\Warehouse\Warehouse;
use App\Services\Projects\ProjectMaterialStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectMaterialStatusServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_builds_project_material_status_from_warehouse_and_procurement_data(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject([
            'stage' => ProjectStage::AwaitingProcurement->value,
        ]);

        $warehouse = Warehouse::query()->create([
            'code' => 'MAIN',
            'name' => 'Main Warehouse',
        ]);

        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => 'accessories',
            'name' => 'Accessories Deck',
        ]);

        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'A1',
            'name' => 'Section A1',
            'section_type' => 'general_accessories',
        ]);

        $bin = Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'BIN-01',
        ]);

        $profileItem = Item::query()->create([
            'sku' => 'ALU-001',
            'name' => 'Frame Profile',
            'category' => ItemCategory::AluminiumProfile->value,
            'unit_of_measure' => 'pcs',
        ]);

        $accessoryItem = Item::query()->create([
            'sku' => 'ACC-001',
            'name' => 'Handle Set',
            'category' => ItemCategory::Accessory->value,
            'unit_of_measure' => 'pcs',
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
            'uploaded_by' => $user->id,
        ]);

        $shortageLine = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'aluminium_profile',
            'warehouse_item_id' => $profileItem->id,
            'material_code' => $profileItem->sku,
            'material_name' => $profileItem->name,
            'quantity' => 5,
            'measurement_mm' => 2400,
            'sort_order' => 1,
        ]);

        $reservedLine = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'accessory',
            'warehouse_item_id' => $accessoryItem->id,
            'material_code' => $accessoryItem->sku,
            'material_name' => $accessoryItem->name,
            'quantity' => 4,
            'sort_order' => 2,
        ]);

        $glassLine = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'glass',
            'material_code' => 'GLS-001',
            'material_name' => '6mm Clear Tempered',
            'quantity' => 2,
            'is_procurement_only' => true,
            'is_glass' => true,
            'sort_order' => 3,
        ]);

        $reservation = StockReservation::query()->create([
            'reservation_number' => 'RSV-0001',
            'project_id' => $project->id,
            'status' => ReservationStatus::Pending->value,
            'reserved_at' => now(),
            'reserved_by' => $user->id,
            'fifo_sequence' => 7,
        ]);

        StockReservationLine::query()->create([
            'reservation_id' => $reservation->id,
            'item_id' => $profileItem->id,
            'bin_id' => $bin->id,
            'quantity_reserved' => 3,
            'quantity_released' => 0,
            'bom_line_ref' => (string) $shortageLine->id,
        ]);

        StockReservationLine::query()->create([
            'reservation_id' => $reservation->id,
            'item_id' => $accessoryItem->id,
            'bin_id' => $bin->id,
            'quantity_reserved' => 4,
            'quantity_released' => 0,
            'bom_line_ref' => null,
        ]);

        $requisition = PurchaseRequisition::query()->create([
            'reference' => 'PRQ-0001',
            'project_id' => $project->id,
            'status' => RequisitionStatus::PendingApproval->value,
            'requested_by' => $user->id,
        ]);

        PurchaseRequisitionLine::query()->create([
            'purchase_requisition_id' => $requisition->id,
            'warehouse_item_id' => $profileItem->id,
            'project_bom_line_id' => $shortageLine->id,
            'description' => 'Top up missing frame profile',
            'sku' => $profileItem->sku,
            'quantity' => 2,
            'trigger_type' => 'bom_shortage',
        ]);

        GlassOrder::query()->create([
            'order_number' => 'GLS-0001',
            'project_id' => $project->id,
            'specs' => ['thickness' => '6mm'],
            'status' => GlassOrderStatus::Ordered->value,
            'created_by' => $user->id,
        ]);

        $status = app(ProjectMaterialStatusService::class)->build($project->fresh());

        $this->assertSame($project->id, $status['project_id']);
        $this->assertSame(ProjectStage::AwaitingProcurement->value, $status['stage']);
        $this->assertSame(1, $status['bom_version']);
        $this->assertSame(3, $status['summary']['total_lines']);
        $this->assertSame(2, $status['summary']['warehouse_lines']);
        $this->assertSame(1, $status['summary']['procurement_only_lines']);
        // Aluminium 5×2400mm packs to 3 bars; reserved 3 pcs covers the bar target.
        $this->assertSame(2, $status['summary']['fully_reserved']);
        $this->assertSame(2, $status['summary']['reservation_units_total']);
        $this->assertSame(2, $status['summary']['reservation_units_reserved']);
        $this->assertTrue($status['summary']['reservation_complete']);
        $this->assertSame(0, $status['summary']['shortage_lines']);
        $this->assertSame(1, $status['summary']['open_requisitions']);
        $this->assertSame(1, $status['summary']['glass_orders_pending']);
        $this->assertSame(1, $status['fifo_position']);
        $this->assertArrayHasKey('can_reserve_now', $status['summary']);
        $this->assertArrayHasKey('warehouse_available', $status['lines'][0]);

        $shortageLineStatus = collect($status['lines'])->firstWhere('bom_line_id', $shortageLine->id);
        $reservedLineStatus = collect($status['lines'])->firstWhere('bom_line_id', $reservedLine->id);
        $glassLineStatus = collect($status['lines'])->firstWhere('bom_line_id', $glassLine->id);

        $this->assertSame('3.000', $shortageLineStatus['reserved_qty']);
        $this->assertSame('3.000', $shortageLineStatus['reservation_target_qty']);
        $this->assertSame('0.000', $shortageLineStatus['shortage_qty']);
        $this->assertSame(3, $shortageLineStatus['bars_needed']);
        $this->assertSame([$requisition->id], $shortageLineStatus['requisition_ids']);

        $this->assertSame('4.000', $reservedLineStatus['reserved_qty']);
        $this->assertSame('0.000', $reservedLineStatus['shortage_qty']);

        $this->assertTrue($glassLineStatus['is_procurement_only']);
        $this->assertSame('0.000', $glassLineStatus['reserved_qty']);
        $this->assertSame('0.000', $glassLineStatus['shortage_qty']);
    }

    public function test_live_warehouse_availability_without_prior_reserve(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject([
            'stage' => ProjectStage::AwaitingProcurement->value,
        ]);

        $warehouse = Warehouse::query()->create([
            'code' => 'MAIN-LIVE',
            'name' => 'Main Live Warehouse',
        ]);

        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => 'accessories',
            'name' => 'Accessories Deck',
        ]);

        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'L1',
            'name' => 'Section L1',
            'section_type' => 'general_accessories',
        ]);

        $bin = Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'BIN-LIVE-01',
        ]);

        $accessoryItem = Item::query()->create([
            'sku' => 'ACC-LIVE-001',
            'name' => 'Live Handle',
            'category' => ItemCategory::Accessory->value,
            'unit_of_measure' => 'pcs',
        ]);

        \App\Models\Warehouse\StockLevel::query()->create([
            'item_id' => $accessoryItem->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
            'uploaded_by' => $user->id,
        ]);

        $line = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'accessory',
            'warehouse_item_id' => $accessoryItem->id,
            'material_code' => $accessoryItem->sku,
            'material_name' => $accessoryItem->name,
            'quantity' => 4,
            'sort_order' => 1,
        ]);

        $status = app(ProjectMaterialStatusService::class)->build($project->fresh());
        $lineStatus = collect($status['lines'])->firstWhere('bom_line_id', $line->id);

        $this->assertSame(0, $status['summary']['fully_reserved']);
        $this->assertSame(0, $status['summary']['shortage_lines']);
        $this->assertTrue($status['summary']['can_fully_reserve']);
        $this->assertTrue($status['summary']['can_reserve_now']);
        $this->assertSame('0.000', $lineStatus['reserved_qty']);
        $this->assertSame('0.000', $lineStatus['shortage_qty']);
        $this->assertGreaterThanOrEqual(4.0, (float) $lineStatus['warehouse_available']);
    }

    public function test_combined_aluminium_sku_counts_as_one_reservation_unit(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject([
            'stage' => ProjectStage::MaterialsReserved->value,
        ]);

        $warehouse = Warehouse::query()->create([
            'code' => 'MAIN-ALU',
            'name' => 'Alu Warehouse',
        ]);
        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => 'accessories',
            'name' => 'Profiles',
        ]);
        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'P1',
            'name' => 'Profiles',
            'section_type' => 'general_accessories',
        ]);
        $bin = Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'BIN-ALU-01',
        ]);

        $profileItem = Item::query()->create([
            'sku' => 'PY08',
            'name' => 'OUTER FRAME',
            'category' => ItemCategory::AluminiumProfile->value,
            'unit_of_measure' => 'metre',
        ]);

        $accessoryItem = Item::query()->create([
            'sku' => 'ROLLER-90',
            'name' => 'Roller 90 SD',
            'category' => ItemCategory::Accessory->value,
            'unit_of_measure' => 'pcs',
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
            'uploaded_by' => $user->id,
        ]);

        // Three cut lines for the same profile across openings — reserved once as nested metres.
        foreach ([[2090, 2], [1816, 2], [1825, 2]] as $index => [$mm, $qty]) {
            ProjectBomLine::query()->create([
                'bom_id' => $bom->id,
                'line_type' => 'aluminium_profile',
                'warehouse_item_id' => $profileItem->id,
                'material_code' => $profileItem->sku,
                'material_name' => $profileItem->name,
                'quantity' => $qty,
                'measurement_mm' => $mm,
                'sort_order' => $index + 1,
            ]);
        }

        ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'accessory',
            'warehouse_item_id' => $accessoryItem->id,
            'material_code' => $accessoryItem->sku,
            'material_name' => $accessoryItem->name,
            'quantity' => 2,
            'sort_order' => 10,
        ]);

        // Combined aluminium reserve qty from packing ≈ metres of bars needed.
        StockReservation::query()->create([
            'reservation_number' => 'RSV-ALU-COMBINED',
            'project_id' => $project->id,
            'status' => ReservationStatus::Pending->value,
            'reserved_at' => now(),
            'reserved_by' => $user->id,
            'fifo_sequence' => 1,
        ]);

        $reservation = StockReservation::query()->where('project_id', $project->id)->firstOrFail();

        // Enough metres to cover nested bar demand for the three cuts.
        StockReservationLine::query()->create([
            'reservation_id' => $reservation->id,
            'item_id' => $profileItem->id,
            'bin_id' => $bin->id,
            'quantity_reserved' => 18,
            'quantity_released' => 0,
            'bom_line_ref' => (string) $bom->lines()->orderBy('id')->value('id'),
        ]);

        $status = app(ProjectMaterialStatusService::class)->build($project->fresh(['latestBom.lines.warehouseItem']));

        $this->assertSame(4, $status['summary']['warehouse_lines']);
        $this->assertSame(2, $status['summary']['reservation_units_total']);
        // Aluminium SKU covered; accessory still open → 1/2 units.
        $this->assertSame(1, $status['summary']['reservation_units_reserved']);
        $this->assertFalse($status['summary']['reservation_complete']);
        $this->assertSame(3, $status['summary']['fully_reserved']);
    }

    public function test_partial_aluminium_hold_counts_as_reserved_unit_when_warehouse_can_cover_gap(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject([
            'stage' => ProjectStage::MaterialsReserved->value,
        ]);

        $warehouse = Warehouse::query()->create([
            'code' => 'MAIN-PARTIAL',
            'name' => 'Partial Warehouse',
        ]);
        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => 'accessories',
            'name' => 'Profiles',
        ]);
        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'P2',
            'name' => 'Profiles',
            'section_type' => 'general_accessories',
        ]);
        $bin = Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'BIN-PARTIAL-01',
        ]);

        $profileItem = Item::query()->create([
            'sku' => 'PY08-PARTIAL',
            'name' => 'OUTER FRAME',
            'category' => ItemCategory::AluminiumProfile->value,
            'unit_of_measure' => 'metre',
        ]);

        \App\Models\Warehouse\StockLevel::query()->create([
            'item_id' => $profileItem->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 100,
            'quantity_reserved' => 18,
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
            'uploaded_by' => $user->id,
        ]);

        // Four bars needed (24m); only 18m held — OK because WH can cover the gap.
        foreach ([[2090, 2], [1816, 2], [2090, 2], [1825, 2]] as $index => [$mm, $qty]) {
            ProjectBomLine::query()->create([
                'bom_id' => $bom->id,
                'line_type' => 'aluminium_profile',
                'warehouse_item_id' => $profileItem->id,
                'material_code' => $profileItem->sku,
                'material_name' => $profileItem->name,
                'quantity' => $qty,
                'measurement_mm' => $mm,
                'sort_order' => $index + 1,
            ]);
        }

        $reservation = StockReservation::query()->create([
            'reservation_number' => 'RSV-PARTIAL-ALU',
            'project_id' => $project->id,
            'status' => ReservationStatus::Pending->value,
            'reserved_at' => now(),
            'reserved_by' => $user->id,
            'fifo_sequence' => 1,
        ]);

        StockReservationLine::query()->create([
            'reservation_id' => $reservation->id,
            'item_id' => $profileItem->id,
            'bin_id' => $bin->id,
            'quantity_reserved' => 18,
            'quantity_released' => 0,
            'bom_line_ref' => (string) $bom->lines()->orderBy('id')->value('id'),
        ]);

        $status = app(ProjectMaterialStatusService::class)->build($project->fresh(['latestBom.lines.warehouseItem']));
        $aluLine = collect($status['lines'])->firstWhere('warehouse_item_id', $profileItem->id);

        $this->assertSame('18.000', $aluLine['reserved_qty']);
        $this->assertSame('24.000', $aluLine['reservation_target_qty']);
        $this->assertTrue($aluLine['is_fully_reserved']);
        $this->assertSame(1, $status['summary']['reservation_units_total']);
        $this->assertSame(1, $status['summary']['reservation_units_reserved']);
        $this->assertTrue($status['summary']['reservation_complete']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Material Status Project',
            'stage' => ProjectStage::AwaitingDeposit->value,
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ], $attributes));
    }
}
