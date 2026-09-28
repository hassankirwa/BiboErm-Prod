<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Crm\Leads\HistoricalLeadImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BulkImportHistoricalLeadsController extends Controller
{
    public function __construct(
        protected HistoricalLeadImportService $historicalLeadImport,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', Lead::class);

        $validated = $request->validate([
            'leads' => ['required', 'array', 'min:1', 'max:500'],
            'leads.*.name' => ['required', 'string', 'max:255'],
            'leads.*.customer_name' => ['nullable', 'string', 'max:255'],
            'leads.*.phone' => ['nullable', 'string', 'max:50'],
            'leads.*.progress' => ['required', 'string', 'max:64'],
            'leads.*.project_name' => ['nullable', 'string', 'max:255'],
            'leads.*.account_name' => ['nullable', 'string', 'max:255'],
            'leads.*.site_name' => ['nullable', 'string', 'max:255'],
            'leads.*.source' => ['nullable', 'string', 'max:64'],
            'leads.*.lead_source' => ['nullable', 'string', 'max:64'],
            'leads.*.estimated_value' => ['nullable', 'numeric', 'min:0'],
            'leads.*.total_quotation_amount' => ['nullable', 'numeric', 'min:0'],
            'leads.*.quote_date' => ['nullable', 'date'],
            'leads.*.external_quote_no' => ['nullable', 'string', 'max:64'],
            'leads.*.quote_no' => ['nullable', 'string', 'max:64'],
            'leads.*.series' => ['nullable', 'string', 'max:255'],
            'leads.*.door_window_series' => ['nullable', 'string', 'max:255'],
            'leads.*.total_sets' => ['nullable'],
            'leads.*.total_sqm' => ['nullable'],
            'leads.*.sales_rep' => ['nullable', 'string', 'max:255'],
            'leads.*.customer_feedback' => ['nullable', 'string'],
            'leads.*.remarks' => ['nullable', 'string'],
        ]);

        $result = $this->historicalLeadImport->import(
            $validated['leads'],
            $request->user(),
        );

        return response()->json(['data' => $result], 201);
    }
}
