<?php

namespace App\Support\Crm;

use App\Models\User;

class SiteVisitAssigneeRoles
{
    /**
     * Spatie roles eligible to be assigned a CRM site visit / field measurement.
     *
     * @var list<string>
     */
    public const ROLES = [
        'sales_representative',
        'field_officer',
        'installation_lead',
        'field_installation_engineer',
        'production_manager',
        'operations_manager',
    ];

    /** @return list<string> */
    public static function all(): array
    {
        return self::ROLES;
    }

    public static function userIsEligible(User $user): bool
    {
        return $user->hasAnyRole(self::ROLES);
    }
}
