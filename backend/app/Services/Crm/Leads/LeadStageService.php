<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadStatus;
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
        'interested' => ['qualified', 'unqualified'],
        'qualified' => ['site_visit_required', 'site_visit_scheduled', 'converted'],
        'site_visit_required' => ['site_visit_scheduled'],
        'site_visit_scheduled' => ['measurements_captured', 'converted'],
        'measurements_captured' => ['converted'],
    ];

    public function updateStatus(Lead $lead, string $status, User $user): Lead
    {
        $current = $lead->status instanceof LeadStatus ? $lead->status->value : (string) $lead->status;

        if ($current === LeadStatus::Converted->value) {
            throw ValidationException::withMessages([
                'status' => ['Converted leads cannot change status.'],
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

        return $lead->fresh();
    }
}
