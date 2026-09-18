<?php

namespace Tests\Unit\Procurement;

use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Procurement\RequisitionTrigger;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use App\Services\Procurement\Requisitions\RequisitionSourceService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RequisitionSourceServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_low_stock_source_creates_pending_approval_requisition(): void
    {
        $user = $this->makeUser();
        $item = $this->makeWarehouseItem(['min_stock_qty' => 10]);
        $this->makeStockLevel($item, 4, 0);

        $requisition = app(RequisitionSourceService::class)->createFromLowStock($user, [$item->id]);

        $requisition->refresh();

        $this->assertSame(RequisitionStatus::PendingApproval, $requisition->status);
        $this->assertSame('Generated from low stock', $requisition->notes);
        $this->assertCount(1, $requisition->lines);
        $this->assertSame(RequisitionTrigger::LowStock, $requisition->lines->first()->trigger_type);
        $this->assertSame('6.000', $requisition->lines->first()->quantity);
    }

    public function test_low_stock_source_includes_out_of_stock_items_without_minimum(): void
    {
        $item = $this->makeWarehouseItem(['min_stock_qty' => 0]);
        // No stock levels → available 0, still eligible when min is unset/zero.

        $source = app(RequisitionSourceService::class)->lowStockSource();
        $match = collect($source)->firstWhere('warehouse_item_id', $item->id);

        $this->assertNotNull($match);
        $this->assertSame('out_of_stock', $match['stock_status']);
        $this->assertSame('0.000', $match['available_qty']);
        $this->assertSame('1.000', $match['quantity_to_requisition']);
        $this->assertTrue($match['can_create_requisition']);
    }

    public function test_low_stock_source_excludes_in_stock_items_without_minimum(): void
    {
        $item = $this->makeWarehouseItem(['min_stock_qty' => 0]);
        $this->makeStockLevel($item, 5, 0);

        $source = app(RequisitionSourceService::class)->lowStockSource();
        $match = collect($source)->firstWhere('warehouse_item_id', $item->id);

        $this->assertNull($match);
    }

    public function test_project_material_source_uses_unreserved_project_quantity(): void
    {
        $user = $this->makeUser();
        $project = $this->makeProject();
        $item = $this->makeWarehouseItem();
        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
        ]);

        $line = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'warehouse_item_id' => $item->id,
            'material_code' => 'AL-01',
            'material_name' => 'Aluminium Profile',
            'line_type' => 'profile',
            'quantity' => 5,
            'sort_order' => 1,
        ]);

        $this->makeStockLevel($item, 2, 0);

        $requisition = app(RequisitionSourceService::class)->createFromProjectMaterials(
            $user,
            $project,
            [$line->id],
        );

        $requisition->refresh();

        $this->assertSame(RequisitionStatus::PendingApproval, $requisition->status);
        $this->assertSame($project->id, $requisition->project_id);
        $this->assertCount(1, $requisition->lines);
        $this->assertSame(RequisitionTrigger::ProjectMaterial, $requisition->lines->first()->trigger_type);
        $this->assertSame($line->id, $requisition->lines->first()->project_bom_line_id);
        $this->assertSame('3.000', $requisition->lines->first()->quantity);
    }

    public function test_glass_order_source_creates_pending_approval_requisition(): void
    {
        $user = $this->makeUser();
        $project = $this->makeProject();
        $supplier = \App\Models\Procurement\Supplier::query()->create([
            'code' => 'GLASS-01',
            'name' => 'Glass Supplier',
            'category' => 'glass',
            'is_active' => true,
        ]);

        $order = \App\Models\Procurement\GlassOrder::query()->create([
            'order_number' => 'GLS-UNIT-001',
            'project_id' => $project->id,
            'supplier_id' => $supplier->id,
            'specs' => [
                'requirements' => '6mm tempered clear',
                'panes' => [[
                    'name' => 'Living room',
                    'width_mm' => 1500,
                    'height_mm' => 1200,
                    'quantity' => 3,
                    'glass_type' => 'TEMP-6',
                ]],
            ],
            'status' => \App\Enums\Procurement\GlassOrderStatus::Draft,
            'created_by' => $user->id,
        ]);

        $requisition = app(RequisitionSourceService::class)->createFromGlassOrder($user, $order);

        $requisition->refresh();
        $order->refresh();

        $this->assertSame(RequisitionStatus::PendingApproval, $requisition->status);
        $this->assertSame($project->id, $requisition->project_id);
        $this->assertSame($supplier->id, $requisition->supplier_id);
        $this->assertSame($requisition->id, $order->purchase_requisition_id);
        $this->assertCount(1, $requisition->lines);
        $this->assertSame(RequisitionTrigger::GlassOrder, $requisition->lines->first()->trigger_type);
        $this->assertStringContainsString('1500×1200 mm', $requisition->lines->first()->description);
    }

    public function test_source_requisitions_require_super_admin_approval(): void
    {
        Event::fake();

        $requester = $this->makeUser(['email' => 'requester@example.com']);
        $nonAdmin = $this->makeUser(['email' => 'approver@example.com']);
        $admin = $this->makeUser(['email' => 'admin@example.com']);
        Role::findOrCreate('super_admin');
        $admin->assignRole('super_admin');

        $requisition = app(PurchaseRequisitionService::class)->createDraft($requester, [
            'notes' => 'Generated from low stock',
            'lines' => [[
                'description' => 'Low-stock profile',
                'quantity' => 1,
                'trigger_type' => RequisitionTrigger::LowStock->value,
            ]],
        ], RequisitionTrigger::LowStock);

        $requisition = app(PurchaseRequisitionService::class)->submit($requisition);

        try {
            app(PurchaseRequisitionService::class)->approve($requisition, $nonAdmin);
            $this->fail('Non-admin approval should be rejected.');
        } catch (AuthorizationException) {
            $this->assertSame(RequisitionStatus::PendingApproval, $requisition->fresh()->status);
        }

        $approved = app(PurchaseRequisitionService::class)->approve($requisition->fresh(), $admin);
        $this->assertSame(RequisitionStatus::Approved, $approved->status);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeUser(array $attributes = []): User
    {
        return User::query()->create(array_merge([
            'name' => 'User '.Str::random(5),
            'email' => Str::lower(Str::random(8)).'@example.com',
            'password' => bcrypt('password123'),
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PRJ-'.Str::upper(Str::random(6)),
            'name' => 'Procurement Project',
            'stage' => 'awaiting_procurement',
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeWarehouseItem(array $attributes = []): Item
    {
        return Item::query()->create(array_merge([
            'sku' => 'SKU-'.Str::upper(Str::random(6)),
            'name' => 'Warehouse Item',
            'category' => 'accessory',
            'unit_of_measure' => 'pcs',
            'min_stock_qty' => 5,
            'is_active' => true,
        ], $attributes));
    }

    protected function makeStockLevel(Item $item, int|float $onHand, int|float $reserved): StockLevel
    {
        return StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $this->makeWarehouseBinId(),
            'quantity_on_hand' => $onHand,
            'quantity_reserved' => $reserved,
            'updated_at' => now(),
        ]);
    }

    protected function makeWarehouseBinId(): int
    {
        $warehouseId = \DB::table('warehouses')->insertGetId([
            'code' => 'WH-'.Str::upper(Str::random(4)),
            'name' => 'Main Warehouse',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $sectionId = \DB::table('warehouse_sections')->insertGetId([
            'deck_id' => \DB::table('warehouse_decks')->insertGetId([
                'warehouse_id' => $warehouseId,
                'slug' => 'deck-'.Str::lower(Str::random(4)),
                'name' => 'Main Deck',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]),
            'code' => 'SEC-'.Str::upper(Str::random(3)),
            'name' => 'Section A',
            'section_type' => 'general',
            'sort_order' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return \DB::table('warehouse_bins')->insertGetId([
            'section_id' => $sectionId,
            'code' => 'BIN-'.Str::upper(Str::random(3)),
            'name' => 'Primary Bin',
            'sort_order' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
