<?php

namespace App\Http\Controllers\Projects;

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
            ->with(['nonConformity', 'parentProductionOrder', 'remakeProductionOrder', 'requester', 'approver'])
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
        $dco->loadMissing(['project', 'nonConformity', 'parentProductionOrder', 'remakeProductionOrder', 'requester', 'approver']);
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

        $updated = $this->designChanges->createRemake($dco, $request->user());

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
