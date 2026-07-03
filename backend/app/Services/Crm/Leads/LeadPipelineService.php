<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadPipelineStage;
use App\Models\Lead;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;

class LeadPipelineService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function updateStage(Lead $lead, LeadPipelineStage $stage, ?User $user = null): Lead
    {
        $current = $lead->pipeline_stage instanceof LeadPipelineStage
            ? $lead->pipeline_stage->value
            : (string) ($lead->pipeline_stage ?? '');

        if ($current === $stage->value) {
            return $lead;
        }

        $lead->update([
            'pipeline_stage' => $stage->value,
            'updated_by' => $user?->id ?? $lead->updated_by,
        ]);

        if ($user) {
            $this->crmAudit->leadPipelineStageChanged(
                $lead,
                ['pipeline_stage' => $current !== '' ? $current : null],
                ['pipeline_stage' => $stage->value],
                $user,
            );
        }

        return $lead->fresh();
    }

    public function onContactConfirmed(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::ContactConfirmed, $user);
    }

    public function onAccountProvisioned(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::AccountProvisioned, $user);
    }

    public function onSiteVisitRequired(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::SiteVisitRequired, $user);
    }

    public function onSiteVisitAssigned(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::SiteVisitAssigned, $user);
    }

    public function onSiteVisitStarted(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::SiteVisitInProgress, $user);
    }

    public function onSiteVisitSubmitted(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::MeasurementsSubmitted, $user);
    }

    public function onSiteVisitInReview(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::MeasurementReview, $user);
    }

    public function onMeasurementApproved(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::DesignRequired, $user);
    }

    public function onDesignJobAssigned(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::WincadInProgress, $user);
    }

    public function onDesignFilesUploaded(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::WincadUploaded, $user);
    }

    public function onReadyForQuotation(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::ReadyForQuotation, $user);
    }

    public function onProformaCreated(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::ProformaCreated, $user);
    }

    public function onProformaSent(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::ProformaSent, $user);
    }

    public function onClientAccepted(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::ClientAccepted, $user);
    }

    public function onAwaitingDeposit(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::AwaitingDeposit, $user);
    }

    public function onDepositPaid(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::DepositPaid, $user);
    }

    public function onDealWon(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::DealWon, $user);
    }

    public function onProjectCreated(Lead $lead, User $user): Lead
    {
        return $this->updateStage($lead, LeadPipelineStage::ProjectCreated, $user);
    }
}
