<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;

class SubmitSiteVisitController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('execute', $siteVisit);

        $validated = $request->validate([
            'client_present' => ['nullable', 'boolean'],
            'visit_outcome' => ['nullable', 'string', 'max:50'],
            'follow_up_required' => ['nullable', 'boolean'],
            'field_officer_notes' => ['nullable', 'string'],
        ]);

        $visit = $this->workflowService->submit($siteVisit, $request->user(), $validated);

        return new SiteVisitResource($visit);
    }
}
