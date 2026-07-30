<?php

namespace Tests\Feature\Warehouse;

use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;
use App\Services\Warehouse\MasterData\BinCatalogExcelService;
use App\Services\Warehouse\MasterData\CatalogImageStorage;
use App\Services\Warehouse\MasterData\WarehouseMaterialCatalogExcelService;
use App\Support\BiboStorage;
use Illuminate\Support\Facades\Storage;

class CatalogBrowserInventoryTest extends WarehouseFeatureTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(BiboStorage::diskName());

        if (! DoorType::query()->where('code', 'GEN')->exists()) {
            DoorType::query()->create([
                'code' => 'GEN',
                'name' => 'General',
                'section_code' => 'SEC-GEN',
                'is_active' => true,
            ]);
        }
    }

    public function test_import_catalog_promotes_temp_image_and_creates_warehouse_item(): void
    {
        $user = $this->warehouseAluminiumManager();
        $images = app(CatalogImageStorage::class);
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $token = 'import-token-abc1';
        $stored = $images->storeExtractBinary($png, 'image/png', 'CAT-IMP-01', $token);
        $this->assertNotNull($stored);

        $codes = [[
            'code' => 'CAT-IMP-01',
            'normalized_code' => 'CATIMP01',
            'name' => 'Catalog Import Profile',
            'description' => 'Imported from extract',
            'sheet' => '90 SERIES',
            'image_path' => $stored['path'],
            'image_url' => $stored['url'],
        ]];

        $items = [[
            'sku' => 'CAT-IMP-01',
            'code' => 'CAT-IMP-01',
            'name' => 'Catalog Import Profile',
            'description' => 'Imported from extract',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'premium',
            'unit_of_measure' => 'metre',
            'image_path' => $stored['path'],
            'source_sheet' => '90 SERIES',
        ]];

        $result = app(BinCatalogExcelService::class)->importCatalog(
            $codes,
            'premium',
            'PREMIUM.xlsx',
            $token,
            $items,
        );

        $this->assertGreaterThanOrEqual(1, $result['stored']);
        $this->assertDatabaseHas('warehouse_items', [
            'sku' => 'CAT-IMP-01',
            'catalog_tier' => 'premium',
        ]);

        $item = Item::query()->where('sku', 'CAT-IMP-01')->first();
        $this->assertNotNull($item);
        $this->assertNotNull($item->image_path);
        $this->assertFalse($images->isExtractPath($item->image_path));
        $this->assertStringContainsString('/premium/', $item->image_path);
        $this->assertFalse(
            Storage::disk(BiboStorage::diskName())
                ->exists('public/warehouse-catalog/extract-import-token-abc1')
        );

        $this->actingAsSanctum($user)
            ->deleteJson("/api/v1/warehouse/master-data/material-catalog/extract/{$token}")
            ->assertOk();
    }

    public function test_catalog_items_api_filters_by_category_tier_and_search(): void
    {
        $user = $this->warehouseAluminiumManager();

        Item::query()->create([
            'sku' => 'CAT-PROF-1',
            'name' => 'Premium Frame',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'premium',
            'description' => 'Blue anodized frame',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);
        Item::query()->create([
            'sku' => 'CAT-ACC-1',
            'name' => 'Roller',
            'category' => 'accessory',
            'catalog_tier' => 'standard',
            'unit_of_measure' => 'each',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);
        Item::query()->create([
            'sku' => 'NON-CATALOG',
            'name' => 'Legacy item',
            'category' => 'aluminium_profile',
            'catalog_tier' => null,
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/master-data/catalog-items?category=aluminium_profile&catalog_tier=premium&search=Blue')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'CAT-PROF-1'])
            ->assertJsonMissing(['sku' => 'CAT-ACC-1'])
            ->assertJsonMissing(['sku' => 'NON-CATALOG']);
    }

    public function test_inventory_catalog_only_includes_zero_stock_and_excludes_non_catalog(): void
    {
        $user = $this->warehouseAluminiumManager();

        $zeroStock = Item::query()->create([
            'sku' => 'CAT-ZERO-1',
            'name' => 'Zero stock catalog item',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'specialty',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 5,
            'is_active' => true,
        ]);

        Item::query()->where('sku', 'PROF-SLD-80MM')->update(['catalog_tier' => null]);

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory?catalog_only=1&search=CAT-ZERO-1&per_page=50')
            ->assertOk();

        $skus = collect($response->json('data'))->pluck('sku')->all();
        $this->assertContains('CAT-ZERO-1', $skus);
        $this->assertNotContains('PROF-SLD-80MM', $skus);

        $row = collect($response->json('data'))->firstWhere('sku', 'CAT-ZERO-1');
        $this->assertSame('0.000', $row['quantity_on_hand']);
        $this->assertSame($zeroStock->id, $row['id']);

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory?catalog_only=1&stock_status=zero&search=CAT-ZERO-1')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'CAT-ZERO-1']);
    }

    public function test_list_catalog_items_includes_stock_aggregates(): void
    {
        $item = Item::query()->create([
            'sku' => 'CAT-STOCK-1',
            'name' => 'Stocked catalog item',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'premium',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 1,
            'is_active' => true,
        ]);

        $binId = StockLevel::query()->value('bin_id');
        $this->assertNotNull($binId);

        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $binId,
            'quantity_on_hand' => 12.5,
            'quantity_reserved' => 2.5,
        ]);

        $rows = app(WarehouseMaterialCatalogExcelService::class)->listCatalogItems('premium', 'CAT-STOCK');
        $this->assertNotEmpty($rows['data']);
        $this->assertSame('12.500', $rows['data'][0]['quantity_on_hand']);
        $this->assertSame('2.500', $rows['data'][0]['quantity_reserved']);
        $this->assertSame('10.000', $rows['data'][0]['quantity_available']);
    }
}
