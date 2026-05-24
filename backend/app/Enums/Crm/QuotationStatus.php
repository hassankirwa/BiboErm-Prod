<?php

namespace App\Enums\Crm;

enum QuotationStatus: string
{
    case Draft = 'draft';
    case InternalReview = 'internal_review';
    case Sent = 'sent';
    case RevisionRequested = 'revision_requested';
    case Revised = 'revised';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Expired = 'expired';
}
