<?php

namespace Tests\Unit\Warehouse;

use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\Warehouse;
use App\Services\Warehouse\MasterData\CatalogWarehouseSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogWarehouseSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    protected CatalogWarehouseSyncService $sync;

    protected function setUp(): void
    {
        parent::setUp();

        DoorType::query()->create([
            'code' => 'GEN',
            'name' => 'General',
            'section_code' => 'SEC-GEN',
            'is_active' => true,
        ]);

        $this->sync = app(CatalogWarehouseSyncService::class);
    }

    public function test_reupload_same_items_leaves_rows_unchanged(): void
    {
        $row = [
            'sku' => 'TUBE-01',
            'name' => 'Square tube',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'specialty',
            'unit_of_measure' => 'metre',
            'source_sheet' => 'TUBES',
            'source_code' => 'TUBE-01',
            'source_name' => 'Square tube',
            'reference_total_qty' => 10.0,
        ];

        $first = $this->sync->syncItems([$row]);
        $this->assertSame(1, $first['added']);
        $this->assertSame(0, $first['unchanged']);

        $second = $this->sync->syncItems([$row]);
        $this->assertSame(0, $second['added']);
        $this->assertSame(0, $second['updated']);
        $this->assertSame(1, $second['unchanged']);
        $this->assertSame(1, Item::query()->where('sku', 'TUBE-01')->count());
    }

    public function test_new_only_mode_inserts_new_row_without_updating_existing_metadata(): void
    {
        Item::query()->create([
            'sku' => 'LOUVER-A',
            'name' => 'Original louver',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'specialty',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        $result = $this->sync->syncItems([
            [
                'sku' => 'LOUVER-A',
                'name' => 'Renamed louver',
                'category' => 'aluminium_profile',
                'catalog_tier' => 'specialty',
                'unit_of_measure' => 'metre',
                'source_code' => 'LOUVER-A',
                'source_name' => 'Renamed louver',
            ],
            [
                'sku' => 'LOUVER-B',
                'name' => 'New louver',
                'category' => 'aluminium_profile',
                'catalog_tier' => 'specialty',
                'unit_of_measure' => 'metre',
                'source_code' => 'LOUVER-B',
                'source_name' => 'New louver',
            ],
        ], 'new_only');

        $this->assertSame(1, $result['added']);
        $this->assertSame(1, $result['unchanged']);
        $this->assertSame('Original louver', Item::query()->where('sku', 'LOUVER-A')->value('name'));
        $this->assertDatabaseHas('warehouse_items', ['sku' => 'LOUVER-B']);
    }

    public function test_changed_reference_total_updates_metadata_without_touching_stock(): void
    {
        $item = Item::query()->create([
            'sku' => 'NET-01',
            'name' => 'Fly net',
            'category' => 'accessory',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'specialty',
            'min_stock_qty' => 5,
            'is_active' => true,
            'catalog_metadata' => [
                'reference_total_qty' => 20.0,
                'reference_total_at' => '2026-01-01T00:00:00+00:00',
            ],
        ]);

        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $this->makeBin()->id,
            'quantity_on_hand' => 12.5,
            'quantity_reserved' => 0,
        ]);

        $result = $this->sync->syncItems([
            [
                'sku' => 'NET-01',
                'name' => 'Fly net',
                'category' => 'accessory',
                'catalog_tier' => 'specialty',
                'unit_of_measure' => 'metre',
                'source_code' => 'NET-01',
                'source_name' => 'Fly net',
                'reference_total_qty' => 48.0,
            ],
        ]);

        $this->assertSame(0, $result['added']);
        $this->assertSame(0, $result['updated']);
        $this->assertSame(1, $result['unchanged']);
        $this->assertSame(1, $result['totals_recorded_as_reference']);

        $item->refresh();
        $this->assertEquals(48.0, (float) $item->catalog_metadata['reference_total_qty']);
        $this->assertSame(5.0, (float) $item->min_stock_qty);
        $this->assertSame(12.5, (float) StockLevel::query()->where('item_id', $item->id)->value('quantity_on_hand'));
    }

    public function test_compare_buckets_new_changed_and_unchanged(): void
    {
        Item::query()->create([
            'sku' => 'SHOWER-OLD',
            'name' => 'Shower channel',
            'category' => 'accessory',
            'unit_of_measure' => 'each',
            'catalog_tier' => 'specialty',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        $diff = $this->sync->compareExtractedWithWarehouse([
            [
                'sku' => 'SHOWER-OLD',
                'name' => 'Shower channel',
                'category' => 'accessory',
                'catalog_tier' => 'specialty',
            ],
            [
                'sku' => 'SHOWER-NEW',
                'name' => 'Shower rail',
                'category' => 'accessory',
                'catalog_tier' => 'specialty',
            ],
            [
                'sku' => 'SHOWER-OLD',
                'name' => 'Renamed shower channel',
                'category' => 'accessory',
                'catalog_tier' => 'specialty',
            ],
        ], 'specialty');

        $this->assertSame(1, $diff['counts']['new']);
        $this->assertSame(1, $diff['counts']['unchanged']);
        $this->assertSame(1, $diff['counts']['changed']);
    }

    public function test_sync_sets_default_bin_from_catalog_tier_section(): void
    {
        $warehouse = Warehouse::query()->create([
            'code' => 'WH-MAIN',
            'name' => 'Main',
            'is_active' => true,
        ]);
        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => 'aluminium',
            'name' => 'Aluminium Profiles',
            'sort_order' => 1,
        ]);
        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'SEC-ALU-PREMIUM',
            'name' => 'Premium Window Profiles',
            'section_type' => 'profile_family',
            'sort_order' => 1,
            'is_active' => true,
        ]);
        $bin = Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'CAGE1',
            'name' => 'Cage 1',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $result = $this->sync->syncItems([[
            'sku' => 'PREM-SYNC-01',
            'name' => 'Premium sync profile',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'premium',
            'unit_of_measure' => 'metre',
            'source_sheet' => '90 SERIES',
        ]]);

        $this->assertSame(1, $result['added']);

        $item = Item::query()->where('sku', 'PREM-SYNC-01')->first();
        $this->assertNotNull($item);
        $this->assertSame($bin->id, $item->aluminiumProfile?->default_bin_id);
        $this->assertSame($bin->id, $item->catalog_metadata['default_bin_id'] ?? null);
        $this->assertSame('SEC-ALU-PREMIUM', $item->catalog_metadata['bin_section_code'] ?? null);
    }

    protected function makeBin(): Bin
    {
        $warehouse = Warehouse::query()->create([
            'code' => 'WH-TEST',
            'name' => 'Test Warehouse',
            'is_active' => true,
        ]);

        $deck = Deck::query()->create([
            'warehouse_id' => $warehouse->id,
            'slug' => 'accessories',
            'name' => 'Accessories',
            'sort_order' => 1,
        ]);

        $section = Section::query()->create([
            'deck_id' => $deck->id,
            'code' => 'SEC-TEST',
            'name' => 'Test Section',
            'section_type' => 'general_accessories',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        return Bin::query()->create([
            'section_id' => $section->id,
            'code' => 'BIN-TEST',
            'name' => 'Test Bin',
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }
}
