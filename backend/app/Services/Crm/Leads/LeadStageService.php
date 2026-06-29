<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Validation\ValidationException;

class LeadStageService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected LeadPipelineService $leadPipelineService,
    ) {}

    /** @var array<string, list<string>> */
    protected array $transitions = [
        'new' => ['contacted', 'not_reachable', 'unqualified'],
        'contacted' => ['interested', 'not_reachable', 'unqualified'],
        'interested' => ['unqualified'],
        'account_created' => [],
        'not_reachable' => [],
        'unqualified' => [],
        // Legacy v1 statuses — site-visit workflow may still advance these leads
        'qualified' => ['unqualified', 'site_visit_required'],
        'site_visit_required' => ['unqualified', 'site_visit_scheduled'],
        'site_visit_scheduled' => ['unqualified', 'measurements_captured'],
        'measurements_captured' => ['unqualified'],
        'converted' => [],
    ];

    /** @var list<string> */
    protected array $terminalStatuses = [
        'account_created',
        'not_reachable',
        'unqualified',
        'converted',
    ];

    public function updateStatus(Lead $lead, string $status, User $user): Lead
    {
        $current = $lead->status instanceof LeadStatus ? $lead->status->value : (string) $lead->status;

        if (in_array($current, $this->terminalStatuses, true) && $status !== $current) {
            throw ValidationException::withMessages([
                'status' => ['Lead status cannot be changed from its current terminal state.'],
            ]);
        }

        if ($status === LeadStatus::AccountCreated->value) {
            throw ValidationException::withMessages([
                'status' => ['Account created status is set automatically after provisioning.'],
            ]);
        }

        $allowed = $this->transitions[$current] ?? [];

        if (! in_array($status, $allowed, true) && $status !== $current) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition from {$current} to {$status}."],
            ]);
        }

        $oldValues = ['status' => $current];

        $lead->update([
            'status' => $status,
            'updated_by' => $user->id,
        ]);

        if ($status !== $current) {
            $this->crmAudit->leadStatusChanged(
                $lead,
                $oldValues,
                ['status' => $status],
                $user,
            );
        }

        $this->syncPipelineStageForStatus($lead->fresh(), $status, $user);

        return $lead->fresh();
    }

    protected function syncPipelineStageForStatus(Lead $lead, string $status, User $user): void
    {
        $stage = $this->pipelineStageForStatus($status);

        if ($stage === null) {
            return;
        }

        $this->leadPipelineService->updateStage($lead, $stage, $user);
    }

    protected function pipelineStageForStatus(string $status): ?LeadPipelineStage
    {
        return match ($status) {
            LeadStatus::New->value => LeadPipelineStage::NewLead,
            LeadStatus::Contacted->value => LeadPipelineStage::ContactConfirmed,
            LeadStatus::Interested->value => LeadPipelineStage::SiteVisitRequired,
            LeadStatus::AccountCreated->value => LeadPipelineStage::SiteVisitRequired,
            LeadStatus::NotReachable->value => LeadPipelineStage::Cold,
            LeadStatus::Unqualified->value => LeadPipelineStage::Lost,
            LeadStatus::Qualified->value => LeadPipelineStage::SiteVisitRequired,
            LeadStatus::SiteVisitRequired->value => LeadPipelineStage::SiteVisitRequired,
            LeadStatus::SiteVisitScheduled->value => LeadPipelineStage::SiteVisitAssigned,
            LeadStatus::MeasurementsCaptured->value => LeadPipelineStage::MeasurementsSubmitted,
            LeadStatus::Converted->value => LeadPipelineStage::ProjectCreated,
            default => null,
        };
    }
}
