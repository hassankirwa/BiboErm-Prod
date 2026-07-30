<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Http\Resources\Projects\ProjectDispatchResource;
use App\Models\Project;
use App\Models\Projects\ProjectDispatch;
use App\Services\Projects\ProjectDispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectDispatchController extends Controller
{
    public function __construct(
        protected ProjectDispatchService $dispatches,
    ) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        $items = ProjectDispatch::query()
            ->where('project_id', $project->id)
            ->with(['driver', 'creator'])
            ->latest()
            ->get();

        return ProjectDispatchResource::collection($items);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('advanceStage', $project);

        $validated = $request->validate([
            'driver_id' => ['required', 'integer', 'exists:procurement_drivers,id'],
            'vehicle_reg' => ['nullable', 'string', 'max:100'],
            'vehicle_details' => ['nullable', 'string'],
            'packing_notes' => ['nullable', 'string'],
            'reason' => ['nullable', 'string'],
        ]);

        $dispatch = $this->dispatches->dispatchToSite(
            $project,
            $request->user(),
            (int) $validated['driver_id'],
            $validated,
        );

        return (new ProjectDispatchResource($dispatch))->response()->setStatusCode(201);
    }

    public function markDelivered(Request $request, ProjectDispatch $projectDispatch): ProjectDispatchResource
    {
        $this->authorize('view', $projectDispatch->project);

        $dispatch = $this->dispatches->markDelivered($projectDispatch);

        return new ProjectDispatchResource($dispatch);
    }
}
