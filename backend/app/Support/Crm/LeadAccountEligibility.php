<?php

namespace App\Support\Crm;

use App\Models\Lead;

class LeadAccountEligibility
{
    /** @var list<string> */
    public const ACCOUNT_READY_STATUSES = [
        'interested',
        'account_created',
        'converted',
        // Legacy
        'qualified',
        'site_visit_required',
        'site_visit_scheduled',
        'measurements_captured',
    ];

    public static function isQualifiedForAccount(Lead $lead): bool
    {
        $status = $lead->status?->value ?? (string) $lead->status;

        return in_array(strtolower($status), self::ACCOUNT_READY_STATUSES, true)
            || $lead->converted_account_id !== null;
    }

    public static function hasProvisionedAccount(Lead $lead): bool
    {
        return $lead->converted_account_id !== null
            || strtolower((string) ($lead->status?->value ?? $lead->status)) === 'account_created';
    }
}
