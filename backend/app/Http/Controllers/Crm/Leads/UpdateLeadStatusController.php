<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\LeadDetailResource;
use App\Models\Lead;
use App\Services\Crm\Leads\LeadStageService;
use Illuminate\Http\Request;

class UpdateLeadStatusController extends Controller
{
    public function __construct(
        protected LeadStageService $leadStageService,
    ) {}

    public function __invoke(Request $request, Lead $lead): LeadDetailResource
    {
        $this->authorize('update', $lead);

        $validated = $request->validate([
            'status' => ['required', 'string', 'max:64'],
        ]);

        $updated = $this->leadStageService->updateStatus(
            $lead,
            $validated['status'],
            $request->user()
        );

        return new LeadDetailResource(
            $updated->load(['leadOwner', 'assignedSalesUser', 'assignedFieldOfficer'])
        );
    }
}
