<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Enums\Crm\MeasurementProductType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'form.lines.*.product_type' => ['nullable', Rule::enum(MeasurementProductType::class)],
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
            'form.lines.*.balcony_details' => ['nullable', 'array'],
            'form.lines.*.balcony_details.balcony_type' => [
                'nullable',
                'string',
                'in:between_two_walls,edge,floating,l_shaped,u_shaped,curved,irregular',
            ],
            'form.lines.*.balcony_details.overall_width_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.overall_projection_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.ffl_to_slab_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.balcony_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.left_side' => ['nullable', 'array'],
            'form.lines.*.balcony_details.right_side' => ['nullable', 'array'],
            'form.lines.*.balcony_details.front_edge' => ['nullable', 'array'],
            'form.lines.*.balcony_details.slab_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.wall_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.step_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.kerb_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.kerb_width_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.floor_slope_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.drain_position' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.drain_distance_from_left_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.drain_distance_from_front_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.curved_sections' => ['nullable', 'array'],
            'form.lines.*.balcony_details.angles' => ['nullable', 'array'],
            'form.lines.*.balcony_details.wall_finish' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.floor_finish' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.waterproofing_present' => ['nullable', 'boolean'],
            'form.lines.*.balcony_details.expansion_joint' => ['nullable', 'boolean'],
            'form.lines.*.balcony_details.obstructions' => ['nullable', 'array'],
            'form.lines.*.balcony_details.obstructions.*' => [
                'string',
                'in:ac_unit,downpipe,light,socket,column,beam,other',
            ],
            'form.lines.*.balcony_details.obstruction_other' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.glass_system' => [
                'nullable',
                'string',
                'in:post_system,u_channel,base_shoe,spigot,standoff,frameless,other',
            ],
            'form.lines.*.balcony_details.glass_system_other' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.glass_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.balcony_details.glass_type' => [
                'nullable',
                'string',
                'in:toughened,laminated,toughened_laminated,other',
            ],
            'form.lines.*.balcony_details.glass_type_other' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.glass_colour' => [
                'nullable',
                'string',
                'in:clear,ultra_clear,grey,bronze,frosted,other',
            ],
            'form.lines.*.balcony_details.glass_colour_other' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.handrail' => [
                'nullable',
                'string',
                'in:none,round,square,slotted,timber,stainless_steel',
            ],
            'form.lines.*.balcony_details.accessories_material' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.accessories_finish' => ['nullable', 'string', 'max:255'],
            'form.lines.*.balcony_details.accessories_colour' => ['nullable', 'string', 'max:255'],
            'form.lines.*.shower_details' => ['nullable', 'array'],
            'form.lines.*.shower_details.shower_type' => [
                'nullable',
                'string',
                'in:straight,corner_l,u_shape,neo_angle,walk_in,bathtub_screen,custom',
            ],
            'form.lines.*.shower_details.overall_width_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.overall_depth_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.overall_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.finished_floor_level_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.ceiling_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.kerb_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.kerb_width_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.kerb_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.left_wall' => ['nullable', 'array'],
            'form.lines.*.shower_details.right_wall' => ['nullable', 'array'],
            'form.lines.*.shower_details.back_wall' => ['nullable', 'array'],
            'form.lines.*.shower_details.angles' => ['nullable', 'array'],
            'form.lines.*.shower_details.drain_centre_from_left_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.drain_centre_from_back_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.drain_diameter_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.shower_head_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.shower_arm_projection_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.mixer_height_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.niche_position' => ['nullable', 'string', 'max:255'],
            'form.lines.*.shower_details.toilet_clearance_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.toilet_projection_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.vanity_clearance_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.wall_tiles_installed' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.floor_tiles_installed' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.waterproofing_completed' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.ceiling_finished' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.out_of_plumb_walls' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.obstructions' => ['nullable', 'string'],
            'form.lines.*.shower_details.design' => [
                'nullable',
                'string',
                'in:sliding,swing,pivot,bi_fold,fixed_screen,walk_in,custom',
            ],
            'form.lines.*.shower_details.glass_thickness_mm' => ['nullable', 'numeric', 'min:0'],
            'form.lines.*.shower_details.glass_type' => [
                'nullable',
                'string',
                'in:toughened,laminated,toughened_laminated,other',
            ],
            'form.lines.*.shower_details.glass_type_other' => ['nullable', 'string', 'max:255'],
            'form.lines.*.shower_details.glass_colour' => [
                'nullable',
                'string',
                'in:clear,ultra_clear,grey,bronze,frosted,other',
            ],
            'form.lines.*.shower_details.glass_colour_other' => ['nullable', 'string', 'max:255'],
            'form.lines.*.shower_details.hardware_hinges' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.hardware_handles' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.hardware_rollers' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.hardware_stabilizer_bar' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.hardware_u_channel' => ['nullable', 'boolean'],
            'form.lines.*.shower_details.hardware_finish' => [
                'nullable',
                'string',
                'in:black,brushed_gold,chrome,brushed_nickel,satin,white,custom',
            ],
            'form.lines.*.shower_details.hardware_finish_custom' => ['nullable', 'string', 'max:255'],
            'form.lines.*.shower_details.seal_type' => [
                'nullable',
                'string',
                'in:magnetic,pvc,silicone,water_deflector',
            ],
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
