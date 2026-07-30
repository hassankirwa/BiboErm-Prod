<?php

namespace Tests\Unit\Warehouse;

use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\Inventory\CatalogPutawayBinService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class CatalogPutawayBinServiceTest extends TestCase
{
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    protected CatalogPutawayBinService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedWarehouse();
        $this->service = app(CatalogPutawayBinService::class);
    }

    public function test_premium_catalog_tier_returns_segmented_cages_in_section(): void
    {
        $premium1 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');
        $premium2 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE2');
        $premium3 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE3');
        $standard = $this->binBySectionAndCode('SEC-ALU-STANDARD', 'CAGE1');
        $frame = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'PREM-OPT-01',
            'name' => 'Premium option profile',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'premium',
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-PREMIUM',
                'default_bin_id' => $premium1->id,
            ],
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '90 SERIES',
            'default_bin_id' => $premium1->id,
        ]);

        $options = $this->service->optionsForItem($item);

        $this->assertSame('catalog_metadata', $options['source']);
        $this->assertSame('premium', $options['catalog_tier']);
        $this->assertSame('SEC-ALU-PREMIUM', $options['section_code']);
        $this->assertSame($premium1->id, $options['suggested_bin_id']);
        $this->assertTrue(collect($options['bins'])->contains('id', $premium1->id));
        $this->assertTrue(collect($options['bins'])->contains('id', $premium2->id));
        $this->assertTrue(collect($options['bins'])->contains('id', $premium3->id));
        $this->assertFalse(collect($options['bins'])->contains('id', $standard->id));
        $this->assertFalse(collect($options['bins'])->contains('id', $frame->id));
        $this->assertGreaterThanOrEqual(3, count($options['bins']));
        $cage1 = collect($options['bins'])->firstWhere('code', 'CAGE1');
        $this->assertNotNull($cage1);
        $this->assertSame('Cage 1', $cage1['tag'] ?? null);
        $this->assertStringStartsWith('Cage 1', (string) ($cage1['label'] ?? ''));
        // Putaway destinations are physical cages, not catalog SKUs.
        $this->assertTrue(
            collect($options['bins'])->every(
                fn (array $bin) => is_int($bin['id'] ?? null)
                    && is_string($bin['code'] ?? null)
                    && ($bin['section_code'] ?? null) === 'SEC-ALU-PREMIUM'
            )
        );
        $this->assertTrue(
            collect($options['bins'])->contains(fn (array $bin) => ($bin['code'] ?? null) === 'CAGE1')
        );
        $this->assertTrue(
            collect($options['bins'])->contains(fn (array $bin) => ($bin['code'] ?? null) === 'CAGE2')
        );
        $this->assertTrue(
            collect($options['bins'])->contains(fn (array $bin) => ($bin['code'] ?? null) === 'CAGE3')
        );

        // catalog_slots remain optional metadata (material → mapped bin), not destinations.
        if (($options['catalog_slots'] ?? []) !== []) {
            $this->assertSame($item->id, $options['suggested_catalog_item_id']);
            $slot = collect($options['catalog_slots'])->firstWhere('id', $item->id);
            $this->assertNotNull($slot);
            $this->assertSame($premium1->id, $slot['to_bin_id']);
        }
    }

    public function test_accessory_uses_accessories_deck_segment_bins(): void
    {
        $handles = $this->binBySectionAndCode('SEC-GEN', 'BIN1');
        $tracks = $this->binBySectionAndCode('SEC-GEN', 'BIN5');
        $balustrade = $this->binBySectionAndCode('SEC-ALU-BALUSTRADE', 'CAGE1');
        $doorTypeId = DoorType::query()->where('code', 'GEN')->value('id')
            ?? DoorType::query()->value('id');

        $item = Item::query()->create([
            'sku' => 'ACC-OPT-01',
            'name' => 'General handle',
            'category' => 'accessory',
            'unit_of_measure' => 'pcs',
            // No catalog_tier → door-type accessories deck fallback.
            'door_type_id' => $doorTypeId,
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        Accessory::query()->create([
            'item_id' => $item->id,
            'door_type_id' => $doorTypeId,
            'default_bin_id' => $handles->id,
        ]);

        $options = $this->service->optionsForItem($item);

        $this->assertSame('accessories_deck', $options['source']);
        $this->assertSame($handles->id, $options['suggested_bin_id']);
        $this->assertTrue(collect($options['bins'])->contains('id', $handles->id));
        $this->assertTrue(collect($options['bins'])->contains('id', $tracks->id));
        $this->assertFalse(collect($options['bins'])->contains('id', $balustrade->id));
        $this->assertTrue(
            collect($options['bins'])->every(fn (array $bin) => ($bin['deck_slug'] ?? null) === 'accessories'
                || str_contains(strtolower((string) ($bin['deck_name'] ?? '')), 'accessor'))
        );
        // Physical BIN codes — not accessory catalog SKUs as destinations.
        $this->assertTrue(
            collect($options['bins'])->contains(fn (array $bin) => ($bin['code'] ?? null) === 'BIN1')
        );
    }

    public function test_catalog_accessory_uses_upload_tier_cages_not_seed_bins(): void
    {
        $premium1 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');
        $premium2 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE2');
        $handles = $this->binBySectionAndCode('SEC-GEN', 'BIN1');
        $doorTypeId = DoorType::query()->where('code', 'GEN')->value('id');

        $item = Item::query()->create([
            'sku' => 'HANDLE-216-TWO-POINT-LOCK',
            'name' => 'Two point lock handle',
            'category' => 'accessory',
            'unit_of_measure' => 'pcs',
            'catalog_tier' => 'premium',
            'door_type_id' => $doorTypeId,
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        Accessory::query()->create([
            'item_id' => $item->id,
            'door_type_id' => $doorTypeId,
            'default_bin_id' => $handles->id,
        ]);

        $options = $this->service->optionsForItem($item);

        $this->assertSame('catalog_tier', $options['source']);
        $this->assertSame('premium', $options['catalog_tier']);
        $this->assertSame('SEC-ALU-PREMIUM', $options['section_code']);
        $this->assertTrue(collect($options['bins'])->contains('id', $premium1->id));
        $this->assertTrue(collect($options['bins'])->contains('id', $premium2->id));
        $this->assertFalse(collect($options['bins'])->contains('id', $handles->id));
        $this->assertTrue(
            collect($options['bins'])->every(
                fn (array $bin) => ($bin['section_code'] ?? null) === 'SEC-ALU-PREMIUM'
            )
        );
    }

    public function test_catalog_slots_metadata_filters_aluminium_by_tier(): void
    {
        $premiumBin = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');
        $premium2 = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE2');
        $standardBin = $this->binBySectionAndCode('SEC-ALU-STANDARD', 'CAGE1');

        $premium = Item::query()->create([
            'sku' => 'SLOT-PREM',
            'name' => 'Premium slot profile',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'premium',
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-PREMIUM',
                'default_bin_id' => $premiumBin->id,
            ],
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);
        AluminiumProfile::query()->create([
            'item_id' => $premium->id,
            'profile_family' => '90 SERIES',
            'width_mm' => 40,
            'depth_mm' => 20,
            'default_bin_id' => $premiumBin->id,
        ]);

        $standard = Item::query()->create([
            'sku' => 'SLOT-STD',
            'name' => 'Standard slot profile',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'standard',
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-STANDARD',
                'default_bin_id' => $standardBin->id,
            ],
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);
        AluminiumProfile::query()->create([
            'item_id' => $standard->id,
            'profile_family' => '70 SERIES',
            'default_bin_id' => $standardBin->id,
        ]);

        $options = $this->service->optionsForItem($premium->fresh(['aluminiumProfile']));

        // Primary putaway options remain physical cages in the premium section.
        $binIds = collect($options['bins'])->pluck('id');
        $this->assertTrue($binIds->contains($premiumBin->id));
        $this->assertTrue($binIds->contains($premium2->id));
        $this->assertFalse($binIds->contains($standardBin->id));
        $this->assertSame($premiumBin->id, $options['suggested_bin_id']);

        // Optional metadata may list catalog materials scoped by tier.
        $slotIds = collect($options['catalog_slots'] ?? [])->pluck('id');
        if ($slotIds->isNotEmpty()) {
            $this->assertTrue($slotIds->contains($premium->id));
            $this->assertFalse($slotIds->contains($standard->id));
            $premiumSlot = collect($options['catalog_slots'])->firstWhere('id', $premium->id);
            $this->assertSame($premiumBin->id, $premiumSlot['to_bin_id']);
        }
    }

    public function test_bin_catalog_code_resolves_section_when_tier_missing(): void
    {
        $specialty = $this->binBySectionAndCode('SEC-ALU-SPECIALTY', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'TUBE-88',
            'name' => 'Aluminium tube',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => 'TUBE',
        ]);

        BinCatalogCode::query()->create([
            'bin_id' => $specialty->id,
            'code' => 'TUBE-88',
            'normalized_code' => 'TUBE88',
            'source_name' => 'Aluminium tube',
            'source_file' => 'aluminium.xlsx',
        ]);

        $options = $this->service->optionsForItem($item);

        $this->assertSame('bin_catalog_code', $options['source']);
        $this->assertSame('specialty', $options['catalog_tier']);
        $this->assertSame('SEC-ALU-SPECIALTY', $options['section_code']);
        $this->assertSame($specialty->id, $options['suggested_bin_id']);
    }

    public function test_non_catalog_aluminium_excludes_catalog_tier_sections(): void
    {
        $frame = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'CAGE1');
        $premium = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'FRAME-ONLY',
            'name' => 'Sliding frame',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => 'SLD',
            'default_bin_id' => $frame->id,
        ]);

        $options = $this->service->optionsForItem($item);

        $this->assertSame('category_deck', $options['source']);
        $this->assertTrue(collect($options['bins'])->contains('id', $frame->id));
        $this->assertFalse(collect($options['bins'])->contains('id', $premium->id));
        $this->assertSame($frame->id, $options['suggested_bin_id']);
    }
}
