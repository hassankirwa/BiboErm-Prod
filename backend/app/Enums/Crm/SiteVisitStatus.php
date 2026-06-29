<?php

namespace App\Enums\Crm;

enum SiteVisitStatus: string
{
    case Draft = 'draft';
    case Scheduled = 'scheduled';
    case Assigned = 'assigned';
    case InProgress = 'in_progress';
    case MeasurementsCaptured = 'measurements_captured';
    case SubmittedForReview = 'submitted_for_review';
    case ClarificationNeeded = 'clarification_needed';
    case NoAccess = 'no_access';
    case Rescheduled = 'rescheduled';
    case Approved = 'approved';
    case RevisitRequired = 'revisit_required';
    case Cancelled = 'cancelled';

    public static function submitted(): self
    {
        return self::SubmittedForReview;
    }
}
