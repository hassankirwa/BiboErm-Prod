<?php

namespace App\Http\Controllers\Projects;

use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Http\Controllers\Controller;
use App\Http\Resources\Projects\DesignChangeOrderResource;
use App\Models\Project;
use App\Models\Projects\DesignChangeOrder;
use App\Services\Projects\DesignChangeOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DesignChangeOrderController extends Controller
{
    public function __construct(
        protected DesignChangeOrderService $designChanges,
    ) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        $items = DesignChangeOrder::query()
            ->where('project_id', $project->id)
            ->with(['nonConformity', 'parentProductionOrder', 'remakeProductionOrder', 'requester', 'approver', 'fieldUnit'])
            ->latest()
            ->get();

        return DesignChangeOrderResource::collection($items);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('advanceStage', $project);

        $validated = $request->validate([
            'reason' => ['nullable', 'string'],
            'measurement_notes' => ['nullable'],
            'scope_bom_line_ids' => ['nullable', 'array'],
            'scope_bom_line_ids.*' => ['integer'],
            'field_non_conformity_id' => ['nullable', 'integer', 'exists:field_non_conformities,id'],
            'parent_production_order_id' => ['nullable', 'integer', 'exists:production_orders,id'],
        ]);

        $dco = $this->designChanges->createForProject($project, $request->user(), $validated);

        return (new DesignChangeOrderResource($dco))->response()->setStatusCode(201);
    }

    public function show(DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing(['project', 'nonConformity', 'parentProductionOrder', 'remakeProductionOrder', 'requester', 'approver', 'fieldUnit']);
        $this->authorize('view', $dco->project);

        return new DesignChangeOrderResource($dco);
    }

    public function approve(Request $request, DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $validated = $request->validate([
            'target_stage' => ['required', 'string', Rule::enum(ProjectStage::class)],
        ]);

        $updated = $this->designChanges->approveAndRewind(
            $dco,
            $request->user(),
            ProjectStage::from($validated['target_stage']),
        );

        return new DesignChangeOrderResource($updated);
    }

    public function createRemake(Request $request, DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $validated = $request->validate([
            'start_stage' => ['nullable', 'string', Rule::enum(ProductionStage::class)],
        ]);

        $startStage = isset($validated['start_stage'])
            ? ProductionStage::from($validated['start_stage'])
            : null;

        $updated = $this->designChanges->createRemake($dco, $request->user(), $startStage);

        return new DesignChangeOrderResource($updated);
    }

    public function update(Request $request, DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $validated = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'change_path' => ['sometimes', 'nullable', Rule::in(['full_remake', 'minor_material'])],
            'items' => ['sometimes', 'array'],
            'items.*.id' => ['nullable', 'string'],
            'items.*.description' => ['required_with:items', 'string', 'max:500'],
            'items.*.qty' => ['nullable', 'numeric', 'min:0'],
            'items.*.unit' => ['nullable', 'string', 'max:30'],
            'items.*.change_type' => ['nullable', Rule::in(['remake', 'material'])],
            'items.*.done' => ['nullable', 'boolean'],
            'items.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'items.*.profile_code' => ['nullable', 'string', 'max:64'],
            'items.*.project_bom_line_id' => ['nullable', 'integer', 'exists:project_bom_lines,id'],
            'items.*.cut_length_mm' => ['nullable', 'integer', 'min:1'],
            'items.*.disposition' => ['nullable', Rule::in(['remake', 'to_offcut', 'material_only'])],
        ]);

        $updated = $this->designChanges->updateDetails($dco, $validated);

        return new DesignChangeOrderResource($updated);
    }

    public function availableProfiles(DesignChangeOrder $dco): JsonResponse
    {
        $dco->loadMissing('project');
        $this->authorize('view', $dco->project);

        return response()->json([
            'data' => $this->designChanges->availableProfiles($dco),
        ]);
    }

    public function scrapToOffcuts(Request $request, DesignChangeOrder $dco): JsonResponse
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $validated = $request->validate([
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['string'],
        ]);

        $result = $this->designChanges->scrapProfilesToOffcuts(
            $dco,
            $request->user(),
            $validated['item_ids'] ?? null,
        );

        return response()->json([
            'data' => [
                'offcuts' => $result['offcuts'],
                'items' => $result['items'],
                'design_change_order' => (new DesignChangeOrderResource($result['design_change_order']))->resolve(),
            ],
        ]);
    }

    public function requestMaterials(Request $request, DesignChangeOrder $dco): JsonResponse
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $validated = $request->validate([
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['string'],
        ]);

        $materialRequest = $this->designChanges->requestRemakeMaterials(
            $dco,
            $request->user(),
            $validated['item_ids'] ?? null,
        );

        return response()->json([
            'data' => [
                'material_request' => [
                    'id' => $materialRequest->id,
                    'status' => $materialRequest->status?->value ?? $materialRequest->status,
                    'project_id' => $materialRequest->project_id,
                    'reason' => $materialRequest->reason,
                    'lines' => $materialRequest->lines->map(fn ($line) => [
                        'id' => $line->id,
                        'warehouse_item_id' => $line->warehouse_item_id,
                        'quantity_requested' => $line->quantity_requested,
                        'notes' => $line->notes,
                    ])->values()->all(),
                ],
                'design_change_order' => (new DesignChangeOrderResource(
                    $dco->fresh(['project', 'parentProductionOrder', 'remakeProductionOrder', 'fieldUnit'])
                ))->resolve(),
            ],
        ], 201);
    }

    public function releaseToProduction(Request $request, DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $updated = $this->designChanges->releaseToProduction($dco, $request->user());

        return new DesignChangeOrderResource($updated);
    }

    public function completeMinor(Request $request, DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $validated = $request->validate([
            'advance_to_stage' => ['nullable', 'string', Rule::enum(ProjectStage::class)],
        ]);

        $updated = $this->designChanges->completeMinor($dco, $request->user(), $validated);

        return new DesignChangeOrderResource($updated);
    }

    public function close(Request $request, DesignChangeOrder $dco): DesignChangeOrderResource
    {
        $dco->loadMissing('project');
        $this->authorize('advanceStage', $dco->project);

        $updated = $this->designChanges->close($dco, $request->user());

        return new DesignChangeOrderResource($updated);
    }
}
