<?php

namespace Tests\Feature\Warehouse;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Item;
use Illuminate\Validation\ValidationException;

class WarehouseMasterDataTest extends WarehouseFeatureTestCase
{
    public function test_door_types_index_and_create(): void
    {
        $user = $this->warehouseAccessoriesManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/master-data/door-types')
            ->assertOk()
            ->assertJsonFragment(['code' => 'SLD']);

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/master-data/door-types', [
                'code' => 'TST',
                'name' => 'Test Door Type',
                'section_code' => 'SEC-TST',
            ])
            ->assertCreated()
            ->assertJsonFragment(['code' => 'TST']);

        $this->assertDatabaseHas('audit_logs', [
            'module' => 'warehouse',
            'action' => 'master_data.updated',
            'entity_type' => 'door_type',
        ]);
    }

    public function test_glass_category_is_rejected_for_warehouse_items(): void
    {
        $this->expectException(ValidationException::class);

        Item::query()->create([
            'sku' => 'GLASS-001',
            'name' => 'Glass Panel',
            'category' => 'glass',
            'unit_of_measure' => 'each',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);
    }

    public function test_procurement_only_category_is_rejected_for_warehouse_items(): void
    {
        $this->expectException(ValidationException::class);

        Item::query()->create([
            'sku' => 'PROC-001',
            'name' => 'Procurement Only Item',
            'category' => 'procurement_only',
            'unit_of_measure' => 'each',
            'min_stock_qty' => 0,
            'is_active' => true,
        ]);
    }

    public function test_aluminium_profiles_index_and_create(): void
    {
        $user = $this->warehouseAluminiumManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/master-data/aluminium-profiles')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'PROF-SLD-80MM']);

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/master-data/aluminium-profiles', [
                'sku' => 'PROF-TEST-90',
                'name' => '90mm Test Profile',
                'unit_of_measure' => 'metre',
                'min_stock_qty' => 50,
                'profile_family' => 'Test Family',
                'width_mm' => 90,
                'standard_bar_length_mm' => 6000,
            ])
            ->assertCreated()
            ->assertJsonFragment(['sku' => 'PROF-TEST-90']);

        $this->assertDatabaseHas('warehouse_items', [
            'sku' => 'PROF-TEST-90',
            'category' => ItemCategory::AluminiumProfile->value,
        ]);

        $itemId = Item::query()->where('sku', 'PROF-TEST-90')->value('id');

        $this->assertDatabaseHas('aluminium_profiles', [
            'item_id' => $itemId,
            'profile_family' => 'Test Family',
        ]);
    }

    public function test_accessories_index_and_create(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $doorType = $this->doorTypeByCode('SLD');
        $bin = $this->binBySectionAndCode('SEC-SLD', 'BIN4');

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/master-data/accessories')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'ACC-HNG-001']);

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/master-data/accessories', [
                'sku' => 'ACC-TEST-001',
                'name' => 'Test Accessory',
                'unit_of_measure' => 'each',
                'door_type_id' => $doorType->id,
                'default_bin_id' => $bin->id,
                'standard_qty' => 3,
            ])
            ->assertCreated()
            ->assertJsonFragment(['sku' => 'ACC-TEST-001']);

        $itemId = Item::query()->where('sku', 'ACC-TEST-001')->value('id');

        $this->assertDatabaseHas('accessories', [
            'item_id' => $itemId,
            'door_type_id' => $doorType->id,
            'default_bin_id' => $bin->id,
        ]);
    }

    public function test_rubbers_index_and_create(): void
    {
        $user = $this->warehouseAccessoriesManager();
        $profile = $this->itemBySku('PROF-SLD-80MM');
        $section = $this->sectionByCode('SEC-RUB-SLD');

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/master-data/rubbers')
            ->assertOk()
            ->assertJsonFragment(['sku' => 'RUB-SLD-80']);

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/master-data/rubbers', [
                'sku' => 'RUB-TEST-01',
                'name' => 'Test Gasket',
                'unit_of_measure' => 'metre',
                'compatible_profile_ids' => [$profile->id],
                'default_section_id' => $section->id,
            ])
            ->assertCreated()
            ->assertJsonFragment(['sku' => 'RUB-TEST-01']);

        $itemId = Item::query()->where('sku', 'RUB-TEST-01')->value('id');

        $this->assertDatabaseHas('rubbers', [
            'item_id' => $itemId,
            'default_section_id' => $section->id,
        ]);
    }

    public function test_procurement_officer_cannot_create_accessories(): void
    {
        $user = $this->procurementOfficer();
        $doorType = $this->doorTypeByCode('SLD');

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/master-data/accessories', [
                'sku' => 'ACC-FORBIDDEN',
                'name' => 'Forbidden Accessory',
                'unit_of_measure' => 'each',
                'door_type_id' => $doorType->id,
            ])
            ->assertForbidden();
    }
}
