<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\AccountResource;
use App\Http\Resources\Crm\LeadDetailResource;
use App\Models\Lead;
use App\Services\Crm\Leads\AccountProvisioningService;
use App\Services\Crm\Leads\LeadPipelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProvisionLeadAccountController extends Controller
{
    public function __construct(
        protected AccountProvisioningService $accountProvisioning,
        protected LeadPipelineService $leadPipelineService,
    ) {}

    public function __invoke(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

        if ($lead->converted_account_id) {
            $lead->load(['convertedAccount', 'convertedContact']);

            return response()->json([
                'data' => [
                    'lead' => new LeadDetailResource($lead),
                    'account' => $lead->convertedAccount
                        ? new AccountResource($lead->convertedAccount)
                        : null,
                ],
            ]);
        }

        if (! $this->accountProvisioning->isEligibleForProvisioning($lead)) {
            throw ValidationException::withMessages([
                'lead' => ['Lead is not ready for account creation. Confirm contact details first.'],
            ]);
        }

        $result = $this->accountProvisioning->provisionFromLead($lead, $request->user());
        $lead = $result['lead'];

        if (! $lead->converted_account_id) {
            throw ValidationException::withMessages([
                'lead' => ['Account could not be created for this lead.'],
            ]);
        }

        $this->leadPipelineService->onAccountProvisioned($lead->fresh(), $request->user());

        $lead = $lead->fresh()->load(['convertedAccount', 'convertedContact']);

        return response()->json([
            'data' => [
                'lead' => new LeadDetailResource($lead),
                'account' => new AccountResource($result['account']),
            ],
        ], 201);
    }
}
