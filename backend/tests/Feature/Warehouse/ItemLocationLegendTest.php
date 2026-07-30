<?php

namespace Tests\Feature\Warehouse;

use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\StockLevel;

class ItemLocationLegendTest extends WarehouseFeatureTestCase
{
    public function test_item_stock_legend_returns_section_cages_with_quantities(): void
    {
        $user = $this->warehouseAluminiumManager();

        $cage1 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');
        $cage2 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE2');

        $item = Item::query()->create([
            'sku' => 'LEGEND-PROF-1',
            'name' => 'Legend Premium Profile',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'premium',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-PREMIUM',
                'default_bin_id' => $cage1->id,
            ],
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '90 SERIES',
            'default_bin_id' => $cage1->id,
        ]);

        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $cage1->id,
            'quantity_on_hand' => 18.5,
            'quantity_reserved' => 3.5,
        ]);
        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $cage2->id,
            'quantity_on_hand' => 4,
            'quantity_reserved' => 0,
        ]);

        $response = $this->actingAsSanctum($user)
            ->getJson("/api/v1/warehouse/items/{$item->id}/stock?include_locations=1")
            ->assertOk()
            ->assertJsonPath('meta.sku', 'LEGEND-PROF-1')
            ->assertJsonPath('meta.section_code', 'SEC-ALU-PREMIUM');

        $rows = collect($response->json('data'));
        $this->assertGreaterThanOrEqual(3, $rows->count(), 'Premium section should expose CAGE1–CAGE3.');

        $cage1Row = $rows->firstWhere('bin_code', 'CAGE1');
        $this->assertNotNull($cage1Row);
        $this->assertSame('18.500', $cage1Row['quantity_on_hand']);
        $this->assertSame('3.500', $cage1Row['quantity_reserved']);
        $this->assertSame('15.000', $cage1Row['quantity_available']);
        $this->assertTrue($cage1Row['is_default']);
        $this->assertTrue($cage1Row['has_stock_row']);

        $cage2Row = $rows->firstWhere('bin_code', 'CAGE2');
        $this->assertSame('4.000', $cage2Row['quantity_on_hand']);

        $cage3Row = $rows->firstWhere('bin_code', 'CAGE3');
        $this->assertNotNull($cage3Row);
        $this->assertSame('0.000', $cage3Row['quantity_on_hand']);
        $this->assertFalse($cage3Row['has_stock_row']);
    }

    public function test_item_stock_legend_shows_default_cage_when_no_stock_levels(): void
    {
        $user = $this->warehouseAluminiumManager();
        $cage1 = $this->binBySectionAndCode('SEC-ALU-STANDARD', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'LEGEND-ZERO-1',
            'name' => 'Zero stock mapped item',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'standard',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-STANDARD',
                'default_bin_id' => $cage1->id,
            ],
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '80 SERIES',
            'default_bin_id' => $cage1->id,
        ]);

        $response = $this->actingAsSanctum($user)
            ->getJson("/api/v1/warehouse/items/{$item->id}/stock?include_locations=1")
            ->assertOk();

        $rows = collect($response->json('data'));
        $this->assertNotEmpty($rows);
        $this->assertTrue($rows->contains(
            fn (array $row) => $row['bin_code'] === 'CAGE1' && $row['quantity_on_hand'] === '0.000'
        ));
        $this->assertTrue($rows->every(fn (array $row) => $row['quantity_on_hand'] === '0.000'));
    }

    public function test_catalog_inventory_include_locations_embeds_per_cage_rows(): void
    {
        $user = $this->warehouseAluminiumManager();
        $cage1 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'LEGEND-CAT-1',
            'name' => 'Catalog legend item',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'premium',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-PREMIUM',
                'default_bin_id' => $cage1->id,
            ],
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '90 SERIES',
            'default_bin_id' => $cage1->id,
        ]);

        StockLevel::query()->create([
            'item_id' => $item->id,
            'bin_id' => $cage1->id,
            'quantity_on_hand' => 7,
            'quantity_reserved' => 1,
        ]);

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory?catalog_only=1&include_locations=1&catalog_tier=premium&search=LEGEND-CAT-1&per_page=20')
            ->assertOk();

        $row = collect($response->json('data'))->firstWhere('sku', 'LEGEND-CAT-1');
        $this->assertNotNull($row);
        $this->assertArrayHasKey('locations', $row);
        $this->assertNotEmpty($row['locations']);
        $this->assertSame('7.000', collect($row['locations'])->firstWhere('bin_code', 'CAGE1')['quantity_on_hand']);
    }

    public function test_catalog_only_without_include_locations_omits_locations_key(): void
    {
        $user = $this->warehouseAluminiumManager();

        Item::query()->create([
            'sku' => 'LEGEND-PLAIN-1',
            'name' => 'Plain catalog item',
            'category' => 'aluminium_profile',
            'catalog_tier' => 'specialty',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory?catalog_only=1&search=LEGEND-PLAIN-1')
            ->assertOk();

        $row = collect($response->json('data'))->firstWhere('sku', 'LEGEND-PLAIN-1');
        $this->assertNotNull($row);
        $this->assertArrayNotHasKey('locations', $row);
    }

    public function test_item_stock_without_legend_flag_keeps_stock_level_resource_shape(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');

        $response = $this->actingAsSanctum($user)
            ->getJson("/api/v1/warehouse/items/{$item->id}/stock")
            ->assertOk()
            ->assertJsonFragment(['quantity_on_hand' => '240.000']);

        $first = $response->json('data.0');
        $this->assertIsArray($first);
        $this->assertArrayHasKey('bin_id', $first);
        $this->assertArrayNotHasKey('display_bin_code', $first);
    }
}
