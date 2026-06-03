<?php

namespace Tests\Feature\Warehouse;

class WarehouseInventoryTest extends WarehouseFeatureTestCase
{
    public function test_inventory_lists_seeded_stock_levels(): void
    {
        $user = $this->warehouseAluminiumManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'PROF-SLD-80MM']);
    }

    public function test_inventory_search_finds_items_by_sku(): void
    {
        $user = $this->warehouseAccessoriesManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory/search?q=ACC-HNG')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'ACC-HNG-001']);
    }

    public function test_item_stock_endpoint_returns_bin_breakdown(): void
    {
        $user = $this->warehouseAluminiumManager();
        $item = $this->itemBySku('PROF-SLD-80MM');

        $this->actingAsSanctum($user)
            ->getJson("/api/v1/warehouse/items/{$item->id}/stock")
            ->assertOk()
            ->assertJsonFragment(['quantity_on_hand' => '240.000']);
    }

    public function test_inventory_by_location_supports_deck_filter(): void
    {
        $user = $this->warehouseAccessoriesManager();

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory/by-location?deck=accessories')
            ->assertOk();

        $deckSlugs = collect($response->json('data'))
            ->pluck('location.deck.slug')
            ->unique()
            ->values()
            ->all();

        $this->assertSame(['accessories'], $deckSlugs);
    }

    public function test_aluminium_manager_inventory_scoped_to_managed_decks(): void
    {
        $user = $this->warehouseAluminiumManager();

        $response = $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory')
            ->assertOk();

        $skus = collect($response->json('data'))->pluck('item.sku')->filter()->unique()->values()->all();

        $this->assertContains('PROF-SLD-80MM', $skus);
        $this->assertNotContains('ACC-HNG-001', $skus);
    }

    public function test_procurement_officer_can_view_inventory(): void
    {
        $user = $this->procurementOfficer();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/inventory')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'PROF-SLD-80MM']);
    }
}
