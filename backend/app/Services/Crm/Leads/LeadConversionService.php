<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Validation\ValidationException;

/**
 * Legacy manual conversion endpoint — provisions account + contact only (v2).
 * Deals are created when a quotation is sent to the client.
 */
class LeadConversionService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected AccountProvisioningService $accountProvisioning,
    ) {}

    public function convert(Lead $lead, User $user, array $data): array
    {
        $status = $lead->status instanceof LeadStatus ? $lead->status->value : $lead->status;

        $allowed = [
            LeadStatus::Interested->value,
            LeadStatus::AccountCreated->value,
            LeadStatus::Qualified->value,
            LeadStatus::SiteVisitScheduled->value,
            LeadStatus::MeasurementsCaptured->value,
        ];

        if (! in_array($status, $allowed, true) && ! $lead->converted_account_id) {
            throw ValidationException::withMessages([
                'status' => ['Lead cannot be converted in its current status.'],
            ]);
        }

        if ($data['create_deal'] ?? false) {
            throw ValidationException::withMessages([
                'create_deal' => ['Deals are created automatically when a quotation is sent.'],
            ]);
        }

        $result = $this->accountProvisioning->provisionFromLead($lead, $user);

        $this->crmAudit->leadConverted($lead, [
            'contact_id' => $result['contact']?->id,
            'account_id' => $result['account']?->id,
            'deal_id' => null,
        ], $user);

        return [
            'lead' => $result['lead'],
            'account' => $result['account'],
            'contact' => $result['contact'],
            'deal' => null,
        ];
    }
}
