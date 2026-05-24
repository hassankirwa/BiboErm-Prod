<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;

class StoreMeasurementLinesController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('execute', $siteVisit);

        $validated = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.room_area_name' => ['required', 'string', 'max:255'],
            'lines.*.width' => ['nullable', 'numeric', 'min:0'],
            'lines.*.height' => ['nullable', 'numeric', 'min:0'],
            'lines.*.quantity' => ['nullable', 'integer', 'min:1'],
            'lines.*.material_preference' => ['nullable', 'string', 'max:100'],
            'lines.*.installation_notes' => ['nullable', 'string'],
            'lines.*.obstacles_notes' => ['nullable', 'string'],
            'lines.*.client_comments' => ['nullable', 'string'],
            'lines.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $visit = $this->workflowService->storeMeasurements(
            $siteVisit,
            $request->user(),
            $validated['lines']
        );

        return new SiteVisitResource($visit);
    }
}
