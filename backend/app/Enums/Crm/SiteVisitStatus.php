<?php

namespace App\Enums\Crm;

enum SiteVisitStatus: string
{
    case Scheduled = 'scheduled';
    case Assigned = 'assigned';
    case InProgress = 'in_progress';
    case MeasurementsCaptured = 'measurements_captured';
    case SubmittedForReview = 'submitted_for_review';
    case Approved = 'approved';
    case RevisitRequired = 'revisit_required';
    case Cancelled = 'cancelled';
}
