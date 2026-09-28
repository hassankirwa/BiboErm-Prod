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
            PayrollSettingsSeeder::class,
            DefaultAdminSeeder::class,
            ModuleDemoUsersSeeder::class,
            FieldInstallationDemoUsersSeeder::class,
            CrmLookupSeeder::class,
            CrmSeeder::class,
            ProcurementSeeder::class,
            WarehouseStructureSeeder::class,
            QcDefaultChecklistsSeeder::class,
            // Demo SKUs / low-stock fixtures are test-only (see InteractsWithWarehouseData).
            // Production master data comes from catalog imports.
        ]);

        app()->make(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
