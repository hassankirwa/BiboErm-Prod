<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadStatus;
use App\Jobs\Crm\CreateAccountFromLead;
use App\Models\Lead;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Validation\ValidationException;

class LeadStageService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
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

        if ($status === LeadStatus::Interested->value && ! $lead->converted_account_id) {
            CreateAccountFromLead::dispatchSync($lead->id, $user->id);
        }

        return $lead->fresh();
    }
}
