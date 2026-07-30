<?php

namespace Tests\Unit\Warehouse;

use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\Inventory\PutawayBinResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class PutawayBinResolverTest extends TestCase
{
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    protected PutawayBinResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedWarehouse();
        $this->resolver = app(PutawayBinResolver::class);
    }

    public function test_suggest_uses_aluminium_default_bin(): void
    {
        $bin = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'ALU-DEF-01',
            'name' => 'Premium frame',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'premium',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '90 SERIES',
            'default_bin_id' => $bin->id,
        ]);

        $this->assertSame($bin->id, $this->resolver->suggest($item->id));
        $this->assertSame($bin->id, $this->resolver->resolve($item->id));
    }

    public function test_suggest_uses_bin_catalog_code_when_default_missing(): void
    {
        $bin = $this->binBySectionAndCode('SEC-ALU-STANDARD', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'STD-CODE-22',
            'name' => 'Standard profile',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'standard',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '85 SERIES',
        ]);

        BinCatalogCode::query()->create([
            'bin_id' => $bin->id,
            'code' => 'STD-CODE-22',
            'normalized_code' => 'STDCODE22',
            'source_name' => 'Standard profile',
        ]);

        $this->assertSame($bin->id, $this->resolver->suggest($item->id));
    }

    public function test_suggest_falls_back_to_catalog_tier_section_cage(): void
    {
        $bin = $this->binBySectionAndCode('SEC-ALU-BALUSTRADE', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'BAL-NO-MAP',
            'name' => 'Balustrade rail',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'balustrade',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => 'BALUSTRADE',
        ]);

        $this->assertSame($bin->id, $this->resolver->suggest($item->id));
    }

    public function test_suggest_prefers_explicit_to_bin_id(): void
    {
        $default = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');
        $explicit = $this->binBySectionAndCode('SEC-ALU-SPECIALTY', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'ALU-EXPLICIT',
            'name' => 'Explicit putaway',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'premium',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => 'General',
            'default_bin_id' => $default->id,
        ]);

        $this->assertSame($explicit->id, $this->resolver->suggest($item->id, $explicit->id));
    }

    public function test_suggest_returns_null_when_unresolvable(): void
    {
        $item = Item::query()->create([
            'sku' => 'NO-BIN-ITEM',
            'name' => 'Unmapped rubber',
            'category' => 'rubber',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        $this->assertNull($this->resolver->suggest($item->id));
    }
}
