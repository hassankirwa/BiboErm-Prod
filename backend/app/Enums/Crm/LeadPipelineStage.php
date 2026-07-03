<?php

namespace App\Enums\Crm;

enum LeadPipelineStage: string
{
    case NewLead = 'new_lead';
    case ContactConfirmed = 'contact_confirmed';
    case AccountProvisioned = 'account_provisioned';
    case SiteVisitRequired = 'site_visit_required';
    case SiteVisitAssigned = 'site_visit_assigned';
    case SiteVisitInProgress = 'site_visit_in_progress';
    case MeasurementsSubmitted = 'measurements_submitted';
    case MeasurementReview = 'measurement_review';
    case DesignRequired = 'design_required';
    case WincadInProgress = 'wincad_in_progress';
    case WincadUploaded = 'wincad_uploaded';
    case ReadyForQuotation = 'ready_for_quotation';
    case ProformaCreated = 'proforma_created';
    case ProformaSent = 'proforma_sent';
    case ClientAccepted = 'client_accepted';
    case AwaitingDeposit = 'awaiting_deposit';
    case DepositPaid = 'deposit_paid';
    case DealWon = 'deal_won';
    case ProjectCreated = 'project_created';
    case Cold = 'cold';
    case Lost = 'lost';

    /** @return list<string> */
    public static function terminalValues(): array
    {
        return [
            self::Cold->value,
            self::Lost->value,
            self::ProjectCreated->value,
        ];
    }

    public function isTerminal(): bool
    {
        return in_array($this->value, self::terminalValues(), true);
    }
}
