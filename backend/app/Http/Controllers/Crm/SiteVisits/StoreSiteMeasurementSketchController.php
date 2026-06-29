<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\CrmAttachmentStorageService;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;

class StoreSiteMeasurementSketchController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
        protected CrmAttachmentStorageService $storage,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('execute', $siteVisit);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $stored = $this->storage->store($validated['file'], 'site-visit-sketch-'.$siteVisit->id);

        $visit = $this->workflowService->storeSketchPath(
            $siteVisit,
            $request->user(),
            $stored['path'],
        );

        return new SiteVisitResource($visit);
    }
}
