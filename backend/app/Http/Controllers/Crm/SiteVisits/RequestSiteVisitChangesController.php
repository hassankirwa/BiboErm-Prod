<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RequestSiteVisitChangesController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('approve', $siteVisit);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['clarification_needed', 'revisit_required'])],
            'notes' => ['required', 'string', 'max:5000'],
        ]);

        $visit = $this->workflowService->requestChanges(
            $siteVisit,
            $request->user(),
            $validated['action'],
            $validated['notes'],
        );

        return new SiteVisitResource($visit);
    }
}
