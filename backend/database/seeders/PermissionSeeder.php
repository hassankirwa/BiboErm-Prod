<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const PERMISSION_NAMES = [
        'users.invite',
        'users.view',
        'users.update',
        'users.suspend',
        'employees.view',
        'employees.update_hr_details',
        'employees.approve',
        'leads.view',
        'leads.create',
        'deals.approve_discount',
        'projects.view',
        'warehouse.stock.view',
        'procurement.po.create',
        'production.schedule.manage',
        'qc.inspect',
        'payroll.view',
        'audit.view',
    ];

    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');

        foreach (self::PERMISSION_NAMES as $name) {
            Permission::findOrCreate($name, $guard);
        }
    }
}
