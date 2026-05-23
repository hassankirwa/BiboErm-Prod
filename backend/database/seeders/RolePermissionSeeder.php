<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');

        Role::findByName('super_admin', $guard)?->syncPermissions(Permission::query()->where('guard_name', $guard)->get());

        $grant = fn (string $role, array $names) => Role::findByName($role, $guard)?->syncPermissions($names);

        $grant('it_admin', [
            'users.invite',
            'users.view',
            'users.update',
            'users.suspend',
            'audit.view',
        ]);

        $grant('hr_manager', [
            'employees.view',
            'employees.update_hr_details',
            'employees.approve',
            'users.invite',
            'users.view',
        ]);

        $grant('sales_representative', [
            'leads.view',
            'leads.create',
            'deals.approve_discount',
        ]);

        $grant('field_officer', ['leads.view', 'leads.create']);
        $grant('project_manager', ['projects.view']);

        $grant('production_manager', [
            'production.schedule.manage',
            'warehouse.stock.view',
        ]);

        $grant('warehouse_manager_accessories', ['warehouse.stock.view']);
        $grant('warehouse_manager_aluminium', ['warehouse.stock.view']);

        $grant('procurement_officer', ['procurement.po.create', 'warehouse.stock.view']);
        $grant('qc_inspector', ['qc.inspect', 'projects.view']);
        $grant('finance_officer', ['payroll.view']);
        $grant('reception', ['leads.view', 'leads.create']);
        $grant('client', ['projects.view']);

        $grant('operations_manager', [
            'users.view',
            'employees.view',
            'leads.view',
            'projects.view',
            'warehouse.stock.view',
            'procurement.po.create',
            'production.schedule.manage',
            'qc.inspect',
            'payroll.view',
            'audit.view',
            'deals.approve_discount',
        ]);
    }
}
