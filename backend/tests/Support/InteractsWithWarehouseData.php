<?php

namespace Tests\Support;

use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\Warehouse;
use Database\Seeders\WarehouseMasterDataSeeder;
use Database\Seeders\WarehouseStructureSeeder;

trait InteractsWithWarehouseData
{
    protected function seedWarehouse(): void
    {
        $this->seed([
            WarehouseStructureSeeder::class,
            WarehouseMasterDataSeeder::class,
        ]);
    }

    protected function warehouseAluminiumManager(array $overrides = []): User
    {
        return $this->userWithDepartmentRole('warehouse', 'warehouse_manager_aluminium', $overrides);
    }

    protected function warehouseAccessoriesManager(array $overrides = []): User
    {
        return $this->userWithDepartmentRole('warehouse', 'warehouse_manager_accessories', $overrides);
    }

    protected function productionManager(array $overrides = []): User
    {
        return $this->userWithDepartmentRole('production', 'production_manager', $overrides);
    }

    protected function procurementOfficer(array $overrides = []): User
    {
        return $this->userWithDepartmentRole('procurement', 'procurement_officer', $overrides);
    }

    protected function operationsManager(array $overrides = []): User
    {
        return $this->userWithDepartmentRole('operations', 'operations_manager', $overrides);
    }

    protected function createTestProject(array $overrides = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PRJ-TEST-'.fake()->unique()->numerify('######'),
            'name' => 'Warehouse Test Project',
        ], $overrides));
    }

    protected function mainWarehouse(): Warehouse
    {
        return Warehouse::query()->where('code', 'WH-MAIN')->firstOrFail();
    }

    protected function deckBySlug(string $slug): Deck
    {
        return Deck::query()
            ->whereHas('warehouse', fn ($q) => $q->where('code', 'WH-MAIN'))
            ->where('slug', $slug)
            ->firstOrFail();
    }

    protected function sectionByCode(string $code): Section
    {
        return Section::query()->where('code', $code)->firstOrFail();
    }

    protected function binBySectionAndCode(string $sectionCode, string $binCode): Bin
    {
        return Bin::query()
            ->whereHas('section', fn ($q) => $q->where('code', $sectionCode))
            ->where('code', $binCode)
            ->firstOrFail();
    }

    protected function itemBySku(string $sku): Item
    {
        return Item::query()->where('sku', $sku)->firstOrFail();
    }

    protected function doorTypeByCode(string $code): DoorType
    {
        return DoorType::query()->where('code', $code)->firstOrFail();
    }

    protected function toolByCode(string $code): Tool
    {
        return Tool::query()->where('tool_code', $code)->firstOrFail();
    }
}
