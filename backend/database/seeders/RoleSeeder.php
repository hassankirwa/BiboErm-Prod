<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const ROLE_NAMES = [
        'super_admin',
        'operations_manager',
        'sales_representative',
        'field_officer',
        'project_manager',
        'quotation_officer',
        'production_manager',
        'warehouse_manager_accessories',
        'warehouse_manager_aluminium',
        'procurement_officer',
        'qc_inspector',
        'hr_manager',
        'finance_officer',
        'it_admin',
        'reception',
        'client',
        'installation_lead',
        'field_installation_engineer',
    ];

    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');

        foreach (self::ROLE_NAMES as $name) {
            Role::findOrCreate($name, $guard);
        }
    }
}
