<?php

namespace App\Support\Crm;

use App\Models\Lead;

class LeadAccountEligibility
{
    /** @var list<string> */
    public const QUALIFIED_STATUSES = [
        'qualified',
        'site_visit_required',
        'site_visit_scheduled',
        'measurements_captured',
        'converted',
    ];

    public static function isQualifiedForAccount(Lead $lead): bool
    {
        $status = $lead->status?->value ?? (string) $lead->status;

        return in_array(strtolower($status), self::QUALIFIED_STATUSES, true);
    }
}
