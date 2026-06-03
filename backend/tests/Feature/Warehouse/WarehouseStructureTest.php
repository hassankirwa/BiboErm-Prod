<?php

namespace Tests\Feature\Warehouse;

use App\Enums\Warehouse\SectionType;
use App\Models\User;

class WarehouseStructureTest extends WarehouseFeatureTestCase
{
    public function test_guest_cannot_access_warehouse_locations(): void
    {
        $this->getJson('/api/v1/warehouse/warehouses')->assertUnauthorized();
    }

    public function test_aluminium_manager_sees_only_aluminium_and_offcuts_decks(): void
    {
        $user = $this->warehouseAluminiumManager();

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/decks')
            ->assertOk();

        $slugs = collect($response->json('data'))->pluck('slug')->sort()->values()->all();

        $this->assertSame(['aluminium', 'offcuts'], $slugs);
    }

    public function test_accessories_manager_sees_only_accessories_and_rubbers_decks(): void
    {
        $user = $this->warehouseAccessoriesManager();

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/decks')
            ->assertOk();

        $slugs = collect($response->json('data'))->pluck('slug')->sort()->values()->all();

        $this->assertSame(['accessories', 'rubbers'], $slugs);
    }

    public function test_warehouse_structure_endpoints_return_seeded_data(): void
    {
        $user = $this->operationsManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/warehouses')
            ->assertOk()
            ->assertJsonFragment(['code' => 'WH-MAIN', 'name' => 'BIBO Main Warehouse']);

        $deck = $this->deckBySlug('accessories');

        $this->actingAsSanctum($user)
            ->getJson("/api/v1/warehouse/decks/{$deck->id}/sections")
            ->assertOk()
            ->assertJsonFragment(['code' => 'SEC-SLD']);

        $section = $this->sectionByCode('SEC-SLD');

        $this->actingAsSanctum($user)
            ->getJson("/api/v1/warehouse/sections/{$section->id}/bins")
            ->assertOk()
            ->assertJsonFragment(['code' => 'BIN2', 'name' => 'Hinges']);
    }

    public function test_location_tree_returns_nested_warehouse_structure(): void
    {
        $user = $this->operationsManager();

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/locations/tree')
            ->assertOk();

        $warehouse = collect($response->json('data'))->firstWhere('code', 'WH-MAIN');

        $this->assertNotNull($warehouse);
        $this->assertNotEmpty($warehouse['decks']);

        $accessoriesDeck = collect($warehouse['decks'])->firstWhere('slug', 'accessories');
        $this->assertNotNull($accessoriesDeck);
        $this->assertNotEmpty($accessoriesDeck['sections']);

        $section = collect($accessoriesDeck['sections'])->firstWhere('code', 'SEC-SLD');
        $this->assertNotNull($section);
        $this->assertNotEmpty($section['bins']);
        $this->assertTrue(collect($section['bins'])->contains(fn (array $bin) => $bin['code'] === 'BIN2'));
    }

    public function test_location_tree_scopes_decks_for_aluminium_manager(): void
    {
        $user = $this->warehouseAluminiumManager();

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/locations/tree')
            ->assertOk();

        $warehouse = collect($response->json('data'))->firstWhere('code', 'WH-MAIN');
        $slugs = collect($warehouse['decks'])->pluck('slug')->sort()->values()->all();

        $this->assertSame(['aluminium', 'offcuts'], $slugs);
    }

    public function test_manager_can_create_section_and_bin(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $deck = $this->deckBySlug('accessories');
        $doorType = $this->doorTypeByCode('GEN');

        $sectionResponse = $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/sections', [
                'deck_id' => $deck->id,
                'door_type_id' => $doorType->id,
                'code' => 'SEC-TEST',
                'name' => 'Test Section',
                'section_type' => SectionType::GeneralAccessories->value,
            ])
            ->assertCreated()
            ->assertJsonFragment(['code' => 'SEC-TEST']);

        $sectionId = $sectionResponse->json('data.id');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/bins', [
                'section_id' => $sectionId,
                'code' => 'BIN-TEST',
                'name' => 'Test Bin',
            ])
            ->assertCreated()
            ->assertJsonFragment(['code' => 'BIN-TEST']);
    }

    public function test_procurement_officer_cannot_manage_locations(): void
    {
        $user = $this->procurementOfficer();
        $deck = $this->deckBySlug('accessories');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/sections', [
                'deck_id' => $deck->id,
                'code' => 'SEC-FORBIDDEN',
                'name' => 'Forbidden Section',
                'section_type' => SectionType::GeneralAccessories->value,
            ])
            ->assertForbidden();
    }
}
