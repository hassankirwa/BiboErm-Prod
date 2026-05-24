<?php

/**
 * Role → permission slugs for BIBO ERM.
 * Super Admin bypasses all checks via Gate::before.
 *
 * Permission conventions: {module}.view | {module}.manage | {module}.approve
 */
return [

    'roles' => [
        'operations_manager' => [
            'analytics.view',
            'crm.view', 'crm.manage',
            'leads.view', 'leads.view_all', 'leads.create', 'leads.update', 'leads.delete', 'leads.convert', 'leads.assign',
            'contacts.view', 'contacts.view_all', 'contacts.create', 'contacts.update',
            'accounts.view', 'accounts.view_all', 'accounts.create', 'accounts.update',
            'deals.view', 'deals.view_all', 'deals.create', 'deals.update', 'deals.approve_discount',
            'deals.mark_won', 'deals.mark_lost', 'deals.create_project',
            'site_visits.view', 'site_visits.view_all', 'site_visits.schedule', 'site_visits.execute', 'site_visits.approve',
            'quotations.view', 'quotations.create', 'quotations.send', 'quotations.approve',
            'deal_payments.record', 'deal_payments.view',
            'activities.view', 'activities.create', 'activities.complete',
            'field_day.view', 'field_day.create', 'field_day.manage',
            'projects.view', 'projects.manage',
            'warehouse.view', 'warehouse.manage',
            'procurement.view', 'procurement.manage', 'procurement.approve',
            'production.view', 'production.manage',
            'qc.view', 'qc.manage',
            'finance.view', 'finance.manage',
            'hr.view',
        ],

        'sales_rep' => [
            'analytics.view',
            'crm.view', 'crm.manage',
            'leads.view', 'leads.create', 'leads.update', 'leads.convert', 'leads.assign',
            'contacts.view', 'contacts.create', 'contacts.update',
            'accounts.view', 'accounts.create', 'accounts.update',
            'deals.view', 'deals.create', 'deals.update', 'deals.mark_won', 'deals.mark_lost', 'deals.create_project',
            'site_visits.view', 'site_visits.schedule', 'site_visits.approve',
            'quotations.view', 'quotations.create', 'quotations.send',
            'deal_payments.record', 'deal_payments.view',
            'activities.view', 'activities.create', 'activities.complete',
            'field_day.view', 'field_day.create',
            'projects.view',
        ],

        'field_officer' => [
            'crm.view', 'crm.manage',
            'leads.view', 'leads.create',
            'site_visits.view', 'site_visits.execute',
            'activities.view', 'activities.create', 'activities.complete',
            'field_day.view', 'field_day.create',
        ],

        'project_manager' => [
            'analytics.view',
            'crm.view',
            'deals.view',
            'projects.view', 'projects.manage',
            'warehouse.view',
            'procurement.view',
            'production.view',
            'qc.view',
            'finance.view',
        ],

        'production_manager' => [
            'analytics.view',
            'projects.view',
            'warehouse.view',
            'production.view', 'production.manage',
            'qc.view',
        ],

        'warehouse_manager_accessories' => [
            'warehouse.view', 'warehouse.manage',
            'procurement.view',
            'projects.view',
        ],

        'warehouse_manager_aluminium' => [
            'warehouse.view', 'warehouse.manage',
            'procurement.view',
            'projects.view',
        ],

        'procurement_officer' => [
            'procurement.view', 'procurement.manage',
            'warehouse.view',
            'projects.view',
        ],

        'qc_inspector' => [
            'qc.view', 'qc.manage',
            'production.view',
            'projects.view',
        ],

        'hr_manager' => [
            'hr.view', 'hr.manage',
            'users.view',
        ],

        'finance_officer' => [
            'finance.view', 'finance.manage',
            'procurement.view',
            'projects.view',
            'analytics.view',
        ],

        'it_admin' => [
            'it.manage',
            'users.manage',
            'users.view',
            'devices.manage',
            'audit.view',
            'hr.view',
            'analytics.view',
            'crm.view',
        ],

        'reception' => [
            'crm.view', 'crm.manage',
            'leads.view', 'leads.create', 'leads.update',
            'contacts.view', 'contacts.create',
            'accounts.view',
        ],
    ],

    'policies' => [
        'lead' => ['view' => 'leads.view', 'create' => 'leads.create', 'manage' => 'leads.update'],
        'contact' => ['view' => 'contacts.view', 'create' => 'contacts.create', 'manage' => 'contacts.update'],
        'account' => ['view' => 'accounts.view', 'create' => 'accounts.create', 'manage' => 'accounts.update'],
        'deal' => ['view' => 'deals.view', 'create' => 'deals.create', 'manage' => 'deals.update'],
        'project' => ['view' => 'projects.view', 'manage' => 'projects.manage'],
        'inventory_item' => ['view' => 'warehouse.view', 'manage' => 'warehouse.manage'],
        'supplier' => ['view' => 'procurement.view', 'manage' => 'procurement.manage'],
        'purchase_requisition' => ['view' => 'procurement.view', 'manage' => 'procurement.manage'],
        'purchase_order' => [
            'view' => 'procurement.view',
            'manage' => 'procurement.manage',
            'approve' => 'procurement.approve',
        ],
        'production_order' => ['view' => 'production.view', 'manage' => 'production.manage'],
        'qc_inspection' => ['view' => 'qc.view', 'manage' => 'qc.manage'],
        'qc_checklist_template' => ['view' => 'qc.view', 'manage' => 'qc.manage'],
        'qc_defect' => ['view' => 'qc.view', 'manage' => 'qc.manage'],
        'invoice' => ['view' => 'finance.view', 'manage' => 'finance.manage'],
        'payment' => ['view' => 'finance.view', 'manage' => 'finance.manage'],
        'expense' => ['view' => 'finance.view', 'manage' => 'finance.manage'],
        'user' => ['view' => 'users.view', 'manage' => 'users.manage'],
        'device' => ['view' => 'devices.manage', 'manage' => 'devices.manage'],
        'employee_profile' => ['view' => 'hr.view', 'manage' => 'hr.manage'],
        'role' => ['view' => 'users.view', 'manage' => 'users.manage'],
        'department' => ['view' => 'users.view', 'manage' => 'users.manage'],
        'audit_log' => ['view' => 'audit.view'],
    ],

];
