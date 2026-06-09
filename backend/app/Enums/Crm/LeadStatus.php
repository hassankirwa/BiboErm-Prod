<?php

namespace App\Enums\Crm;

enum LeadStatus: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case Interested = 'interested';
    case AccountCreated = 'account_created';
    case NotReachable = 'not_reachable';
    case Unqualified = 'unqualified';
    case Qualified = 'qualified';
    case SiteVisitRequired = 'site_visit_required';
    case SiteVisitScheduled = 'site_visit_scheduled';
    case MeasurementsCaptured = 'measurements_captured';
    case Converted = 'converted';
}
