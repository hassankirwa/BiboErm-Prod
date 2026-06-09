<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\AccountResource;
use App\Http\Resources\Crm\ContactResource;
use App\Http\Resources\Crm\DealPaymentResource;
use App\Http\Resources\Crm\DealResource;
use App\Http\Resources\Crm\LeadDetailResource;
use App\Models\Lead;
use App\Services\Crm\Leads\LeadConversionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConvertLeadController extends Controller
{
    public function __construct(
        protected LeadConversionService $conversionService,
    ) {}

    public function __invoke(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('convert', $lead);

        $validated = $request->validate([
            'create_contact' => ['sometimes', 'boolean'],
            'create_account' => ['sometimes', 'boolean'],
            'create_deal' => ['sometimes', 'boolean'],
            'deal_name' => ['nullable', 'string', 'max:255'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'quotation_id' => ['nullable', 'exists:quotations,id'],
            'payment_reference' => ['required_with:amount_paid', 'nullable', 'string', 'max:100'],
            'payment_date' => ['required_with:amount_paid', 'nullable', 'date'],
            'amount_paid' => ['nullable', 'numeric', 'min:0.01'],
            'payment_method' => ['required_with:amount_paid', 'nullable', 'string', 'max:30'],
            'payment_status' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($lead->converted_account_id) {
            abort_unless(
                $request->user()->can('deal_payments.record') || $request->user()->can('crm.manage'),
                403,
                'You do not have permission to record deal payments.',
            );
        }

        $result = $this->conversionService->convert($lead, $request->user(), $validated);

        return response()->json([
            'data' => [
                'lead' => new LeadDetailResource($result['lead']),
                'account' => $result['account'] ? new AccountResource($result['account']) : null,
                'contact' => $result['contact'] ? new ContactResource($result['contact']) : null,
                'deal' => $result['deal'] ? new DealResource($result['deal']) : null,
                'payment' => isset($result['payment']) && $result['payment']
                    ? new DealPaymentResource($result['payment'])
                    : null,
            ],
        ]);
    }
}
