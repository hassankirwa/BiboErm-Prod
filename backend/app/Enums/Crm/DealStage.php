<?php

namespace App\Enums\Crm;

enum DealStage: string
{
    case NewDeal = 'new_deal';
    case SiteVisitPending = 'site_visit_pending';
    case MeasurementsCompleted = 'measurements_completed';
    case QuotationPreparation = 'quotation_preparation';
    case QuotationSent = 'quotation_sent';
    case NegotiationRevision = 'negotiation_revision';
    case Accepted = 'accepted';
    case DepositPending = 'deposit_pending';
    case DepositRecorded = 'deposit_recorded';
    case Won = 'won';
    case ProjectCreated = 'project_created';
    case Lost = 'lost';
}
