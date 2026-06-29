<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;

class UpdateSiteMeasurementFormController extends Controller
{
    public function __construct(
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function __invoke(Request $request, SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('execute', $siteVisit);

        $validated = $request->validate([
            'draft' => ['sometimes', 'boolean'],
            'form' => ['required', 'array'],
            'form.client_name' => ['nullable', 'string', 'max:255'],
            'form.project_name' => ['nullable', 'string', 'max:255'],
            'form.measured_at' => ['nullable', 'date'],
            'form.project_address' => ['nullable', 'string'],
            'form.client_contact' => ['nullable', 'string', 'max:255'],
            'form.phone' => ['nullable', 'string', 'max:50'],
            'form.site_rep' => ['nullable', 'string', 'max:255'],
            'form.architect_designer' => ['nullable', 'string', 'max:255'],
            'form.main_contractor' => ['nullable', 'string', 'max:255'],
            'form.measured_by' => ['nullable', 'string', 'max:255'],
            'form.aluminium_series' => ['nullable', 'string', 'in:standard,premium,executive'],
            'form.aluminium_colour' => ['nullable', 'string', 'max:100'],
            'form.glass_type' => ['nullable', 'string', 'max:100'],
            'form.mesh_required' => ['nullable', 'boolean'],
            'form.grill_required' => ['nullable', 'boolean'],
            'form.floor_finish' => ['nullable', 'string', 'in:tile,spc,wood,marble,other'],
            'form.floor_finish_other' => ['nullable', 'string', 'max:100'],
            'form.floor_finish_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.site_status' => ['nullable', 'array'],
            'form.site_status.*' => ['string', 'in:masonry,plastered,screeded,tiled,painted,occupied'],
            'form.operational_notes' => ['nullable', 'string'],
            'form.lines' => ['nullable', 'array'],
            'form.lines.*.ref' => ['nullable', 'string', 'max:50'],
            'form.lines.*.unit_floor' => ['nullable', 'string', 'max:100'],
            'form.lines.*.room_location' => ['nullable', 'string', 'max:255'],
            'form.lines.*.product_type' => ['nullable', 'string', 'max:100'],
            'form.lines.*.quantity' => ['nullable', 'integer', 'min:1'],
            'form.lines.*.width_top_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.width_centre_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.width_bottom_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.height_left_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.height_centre_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.height_right_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.wall_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.wall_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.photo_refs' => ['nullable', 'array'],
            'form.lines.*.photo_refs.*' => ['integer'],
            'form.lines.*.remarks' => ['nullable', 'string'],
        ]);

        $visit = $this->workflowService->saveMeasurementForm(
            $siteVisit,
            $request->user(),
            $validated['form'],
            (bool) ($validated['draft'] ?? false),
        );

        return new SiteVisitResource($visit);
    }
}
