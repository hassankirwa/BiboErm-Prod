<?php

namespace Tests\Feature\Procurement;

use App\Enums\Warehouse\DeckSlug;
use App\Enums\Warehouse\ItemCategory;
use App\Enums\Warehouse\SectionType;
use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProcurementStockControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_procurement_stock_overview_returns_material_statuses_and_alerts(): void
    {
        $this->actingAsProcurementOfficer();
        $bin = $this->makeWarehouseBin();

        $inStock = Item::query()->create([
            'sku' => 'ACC-LOCK-01',
            'name' => 'Lock Set',
            'category' => ItemCategory::Accessory,
            'unit_of_measure' => 'each',
            'min_stock_qty' => 10,
            'is_active' => true,
        ]);

        $lowStock = Item::query()->create([
            'sku' => 'RUB-SEAL-01',
            'name' => 'Rubber Seal',
            'category' => ItemCategory::Rubber,
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 10,
            'is_active' => true,
        ]);

        $outOfStock = Item::query()->create([
            'sku' => 'ALU-FRAME-01',
            'name' => 'Aluminium Frame',
            'category' => ItemCategory::AluminiumProfile,
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 5,
            'is_active' => true,
        ]);

        StockLevel::query()->create([
            'item_id' => $inStock->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 20,
            'quantity_reserved' => 5,
            'updated_at' => now(),
        ]);

        StockLevel::query()->create([
            'item_id' => $lowStock->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 7,
            'quantity_reserved' => 1,
            'updated_at' => now(),
        ]);

        StockLevel::query()->create([
            'item_id' => $outOfStock->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 0,
            'quantity_reserved' => 0,
            'updated_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/procurement/stock');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'summary' => [
                        'total_materials',
                        'categories_count',
                        'in_stock_items',
                        'low_stock_items',
                        'out_of_stock_items',
                        'alert_items',
                        'total_on_hand_qty',
                        'total_reserved_qty',
                        'total_available_qty',
                    ],
                    'status_breakdown',
                    'categories',
                    'alerts',
                    'items',
                ],
            ]);

        $this->assertSame(3, $response->json('data.summary.total_materials'));
        $this->assertSame(1, $response->json('data.summary.in_stock_items'));
        $this->assertSame(1, $response->json('data.summary.low_stock_items'));
        $this->assertSame(1, $response->json('data.summary.out_of_stock_items'));
        $this->assertSame(2, $response->json('data.summary.alert_items'));
        $this->assertSame(3, $response->json('data.meta.total'));

        $itemsBySku = collect($response->json('data.items'))->keyBy('sku');

        $this->assertSame('in_stock', $itemsBySku['ACC-LOCK-01']['stock_status']);
        $this->assertSame('15.000', $itemsBySku['ACC-LOCK-01']['quantity_available']);
        $this->assertSame('low_stock', $itemsBySku['RUB-SEAL-01']['stock_status']);
        $this->assertSame('out_of_stock', $itemsBySku['ALU-FRAME-01']['stock_status']);

        $alertsBySku = collect($response->json('data.alerts'))->keyBy('sku');
        $this->assertSame('4.000', $alertsBySku['RUB-SEAL-01']['shortage_qty']);
        $this->assertSame('5.000', $alertsBySku['ALU-FRAME-01']['shortage_qty']);
    }

    public function test_procurement_stock_analytics_returns_category_and_reorder_views(): void
    {
        $this->actingAsProcurementOfficer();
        $bin = $this->makeWarehouseBin();

        $item = Item::query()->create([
            'sku' => 'ACC-ROLLER-01',
            'name' => 'Roller Set',
            'category' => ItemCategory::Accessory,
            'unit_of_measure' => 'each',
            'min_stock_qty' => 12,
            'is_active' => true,
        ]);

        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $bin->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 2,
            'updated_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/procurement/stock/analytics');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'summary',
                    'status_breakdown',
                    'category_distribution',
                    'alert_summary' => ['total_alerts', 'low_stock_items', 'out_of_stock_items'],
                    'top_available_items',
                    'urgent_reorder_items',
                ],
            ]);

        $this->assertSame(1, $response->json('data.alert_summary.total_alerts'));
        $this->assertSame('Accessories', $response->json('data.category_distribution.0.label'));
        $this->assertSame('ACC-ROLLER-01', $response->json('data.urgent_reorder_items.0.sku'));
        $this->assertSame('8.000', $response->json('data.top_available_items.0.quantity_available'));
    }

    protected function actingAsProcurementOfficer(): void
    {
        Permission::findOrCreate('procurement.view');

        $user = User::factory()->create([
            'name' => 'Procurement Tester',
            'email' => 'procurement@example.com',
            'status' => User::STATUS_ACTIVE,
        ]);

        $user->givePermissionTo('procurement.view');

        Sanctum::actingAs($user);
    }

    protected function makeWarehouseBin(): Bin
    {
        $warehouse = Warehouse::query()->create([
            'code' => 'MAIN',
            'name' => 'Main Warehouse',
            'address' => 'Nairobi',
            'is_active' => true,
        ]);

        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => DeckSlug::Accessories,
            'name' => 'Accessories Deck',
            'sort_order' => 1,
        ]);

        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'SEC-01',
            'name' => 'Section 01',
            'section_type' => SectionType::GeneralAccessories,
            'sort_order' => 1,
            'is_active' => true,
        ]);

        return Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'BIN-01',
            'name' => 'Primary Bin',
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }
}
