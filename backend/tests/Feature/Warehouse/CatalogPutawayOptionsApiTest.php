<?php

namespace Tests\Feature\Warehouse;

use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\BinCatalogCode;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;

class CatalogPutawayOptionsApiTest extends WarehouseFeatureTestCase
{
    public function test_procurement_officer_can_load_catalog_section_putaway_options(): void
    {
        $user = $this->procurementOfficer();
        $premium = $this->binBySectionAndCode('SEC-ALU-PREMIUM', 'CAGE1');
        $frame = $this->binBySectionAndCode('SEC-ALU-SLD-FRAME', 'CAGE1');

        $item = Item::query()->create([
            'sku' => 'API-PREM-01',
            'name' => 'API Premium profile',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'catalog_tier' => 'premium',
            'catalog_metadata' => [
                'bin_section_code' => 'SEC-ALU-PREMIUM',
                'default_bin_id' => $premium->id,
            ],
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        AluminiumProfile::query()->create([
            'item_id' => $item->id,
            'profile_family' => '90 SERIES',
            'default_bin_id' => $premium->id,
        ]);

        BinCatalogCode::query()->create([
            'bin_id' => $premium->id,
            'code' => 'API-PREM-01',
            'normalized_code' => 'APIPREM01',
            'source_name' => 'API Premium profile',
            'source_file' => 'PREMIUM.xlsx',
        ]);

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory/putaway-options?'.http_build_query([
                'item_ids' => [$item->id],
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.warehouse_item_id', $item->id)
            ->assertJsonPath('data.0.section_code', 'SEC-ALU-PREMIUM')
            ->assertJsonPath('data.0.catalog_tier', 'premium')
            ->assertJsonPath('data.0.suggested_bin_id', $premium->id);

        $bins = collect($response->json('data.0.bins'));
        $binIds = $bins->pluck('id');
        $this->assertTrue($binIds->contains($premium->id));
        $this->assertFalse($binIds->contains($frame->id));
        $this->assertGreaterThanOrEqual(
            3,
            $binIds->count(),
            'Premium section should expose segmented CAGE1–CAGE3 putaway options.'
        );
        $this->assertTrue(
            $bins->contains(fn (array $bin) => ($bin['code'] ?? null) === 'CAGE1')
        );
        $this->assertTrue(
            $bins->contains(fn (array $bin) => ($bin['code'] ?? null) === 'CAGE2')
        );
        $this->assertTrue(
            $bins->contains(fn (array $bin) => ($bin['code'] ?? null) === 'CAGE3')
        );
        $this->assertTrue(
            $bins->every(fn (array $bin) => ($bin['section_code'] ?? null) === 'SEC-ALU-PREMIUM'
                && is_string($bin['code'] ?? null)
                && is_int($bin['id'] ?? null)),
            'Putaway options must be physical bins, not catalog material SKUs.'
        );

        // catalog_slots may still appear as optional metadata; they are not destinations.
        $slots = collect($response->json('data.0.catalog_slots') ?? []);
        if ($slots->isNotEmpty()) {
            $ownSlot = $slots->firstWhere('id', $item->id);
            $this->assertNotNull($ownSlot);
            $this->assertSame($premium->id, $ownSlot['to_bin_id']);
        }
    }

    public function test_putaway_options_return_accessory_physical_bins(): void
    {
        $user = $this->procurementOfficer();
        $handles = $this->binBySectionAndCode('SEC-GEN', 'BIN1');
        $doorTypeId = DoorType::query()->where('code', 'GEN')->value('id')
            ?? DoorType::query()->value('id');

        $item = Item::query()->create([
            'sku' => 'API-ACC-01',
            'name' => 'API Accessory',
            'category' => 'accessory',
            'unit_of_measure' => 'pcs',
            'catalog_tier' => 'balustrade',
            'door_type_id' => $doorTypeId,
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);

        Accessory::query()->create([
            'item_id' => $item->id,
            'door_type_id' => $doorTypeId,
            'default_bin_id' => $handles->id,
        ]);

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory/putaway-options?'.http_build_query([
                'item_ids' => [$item->id],
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.warehouse_item_id', $item->id)
            ->assertJsonPath('data.0.source', 'accessories_deck')
            ->assertJsonPath('data.0.suggested_bin_id', $handles->id);

        $bins = collect($response->json('data.0.bins'));
        $this->assertTrue($bins->contains('id', $handles->id));
        $this->assertTrue(
            $bins->contains(fn (array $bin) => ($bin['code'] ?? null) === 'BIN1')
        );
        $this->assertTrue(
            $bins->every(fn (array $bin) => is_int($bin['id'] ?? null)
                && is_string($bin['code'] ?? null)),
            'Accessory putaway options must be physical bins, not catalog SKUs.'
        );
    }

    public function test_putaway_options_requires_item_ids(): void
    {
        $user = $this->procurementOfficer();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory/putaway-options')
            ->assertStatus(422);
    }
}
