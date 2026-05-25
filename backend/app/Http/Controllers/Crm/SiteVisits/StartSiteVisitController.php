<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;

class StartSiteVisitController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('execute', $siteVisit);

        $validated = $request->validate([
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
        ]);

        $visit = $this->workflowService->start($siteVisit, $request->user(), $validated);

        return new SiteVisitResource($visit);
    }
}
