<?php

namespace App\Support;

use App\Models\User;

final class UserHomeRoute
{
    /**
     * @var list<string>
     */
    private const WORKSPACE_HUB_ROLES = ['super_admin', 'it_admin'];

    /**
     * Field measurements and installation — land on Field module, not CRM.
     *
     * @var list<string>
     */
    private const FIELD_MODULE_ROLES = [
        'field_officer',
        'installation_lead',
        'field_installation_engineer',
    ];

    public static function forUser(User $user): string
    {
        $user->loadMissing(['departmentRoles.department', 'roles']);

        if ($user->hasAnyRole(self::WORKSPACE_HUB_ROLES)) {
            return '/workspace';
        }

        if ($user->hasAnyRole(self::FIELD_MODULE_ROLES)) {
            return '/field';
        }

        $primary = $user->departmentRoles->firstWhere('is_primary', true)
            ?? $user->departmentRoles->first();

        $module = $primary?->department?->default_module
            ?? self::slugToModule($primary?->department?->slug);

        if ($module === 'workspace' || $module === null) {
            $module = self::slugToModule($primary?->department?->slug) ?? 'crm';
        }

        if ($module === 'workspace') {
            $module = 'crm';
        }

        return self::moduleToRoute($module);
    }

    private static function moduleToRoute(string $module): string
    {
        return match ($module) {
            'crm' => '/crm',
            'field' => '/field',
            'production' => '/production/schedule',
            'warehouse' => '/warehouse/inventory',
            'procurement' => '/procurement/orders',
            'qc' => '/qc/inspections',
            'hr' => '/hr',
            'finance' => '/finance/invoices',
            'it' => '/it/users',
            'projects' => '/projects',
            'quotation' => '/quotation/proforma',
            'analytics' => '/analytics',
            default => '/crm',
        };
    }

    private static function slugToModule(?string $slug): ?string
    {
        return match ($slug) {
            'sales_marketing', 'reception' => 'crm',
            'field', 'field_installation' => 'field',
            'production' => 'production',
            'warehouse' => 'warehouse',
            'procurement' => 'procurement',
            'quality_control' => 'qc',
            'hr' => 'hr',
            'finance' => 'finance',
            'it' => 'it',
            'project_management' => 'projects',
            'quotation' => 'quotation',
            'operations' => 'analytics',
            default => null,
        };
    }
}
