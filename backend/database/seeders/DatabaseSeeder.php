<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            DepartmentSeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            DefaultAdminSeeder::class,
            ModuleDemoUsersSeeder::class,
            CrmLookupSeeder::class,
            CrmSeeder::class,
            ProcurementSeeder::class,
            WarehouseStructureSeeder::class,
            WarehouseMasterDataSeeder::class,
        ]);

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
