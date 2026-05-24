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
        'audit.view',
        'analytics.view',
        'crm.view',
        'crm.manage',
        'leads.view',
        'leads.view_all',
        'leads.create',
        'leads.update',
        'leads.delete',
        'leads.convert',
        'leads.assign',
        'contacts.view',
        'contacts.view_all',
        'contacts.create',
        'contacts.update',
        'accounts.view',
        'accounts.view_all',
        'accounts.create',
        'accounts.update',
        'deals.view',
        'deals.view_all',
        'deals.create',
        'deals.update',
        'deals.approve_discount',
        'deals.mark_won',
        'deals.mark_lost',
        'deals.create_project',
        'site_visits.view',
        'site_visits.view_all',
        'site_visits.schedule',
        'site_visits.execute',
        'site_visits.approve',
        'quotations.view',
        'quotations.create',
        'quotations.send',
        'quotations.approve',
        'deal_payments.record',
        'deal_payments.view',
        'activities.view',
        'activities.create',
        'activities.complete',
        'field_day.view',
        'field_day.create',
        'field_day.manage',
        'projects.view',
        'projects.manage',
        'warehouse.view',
        'warehouse.manage',
        'warehouse.stock.view',
        'procurement.view',
        'procurement.manage',
        'procurement.approve',
        'procurement.po.create',
        'production.view',
        'production.manage',
        'production.schedule.manage',
        'qc.view',
        'qc.manage',
        'qc.inspect',
        'finance.view',
        'finance.manage',
        'payroll.view',
        'hr.view',
    ];

    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');

        foreach (self::PERMISSION_NAMES as $name) {
            Permission::findOrCreate($name, $guard);
        }
    }
}
