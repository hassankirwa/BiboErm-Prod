<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectWave;
use App\Services\Projects\ProjectWaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectWaveController extends Controller
{
    public function __construct(
        protected ProjectWaveService $waves,
    ) {}

    public function index(Project $project): JsonResponse
    {
        $tree = $this->waves->progressTree($project);

        return response()->json([
            'data' => $tree,
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:120'],
            'scope_ids' => ['nullable', 'array'],
            'scope_ids.*' => ['integer', 'exists:project_scopes,id'],
        ]);

        $wave = $this->waves->createWave($project, $data);

        return response()->json([
            'data' => $this->wavePayload($wave),
        ], 201);
    }

    public function bootstrap(Project $project): JsonResponse
    {
        $result = $this->waves->bootstrapFromMeasurements($project);

        return response()->json([
            'data' => [
                'wave' => $this->wavePayload($result['wave']),
                'scopes_created' => $result['scopes_created'],
                'floors_linked' => $result['floors_linked'],
                'progress' => $this->waves->progressTree($project->fresh()),
            ],
        ]);
    }

    public function assignScopes(Request $request, Project $project, ProjectWave $wave): JsonResponse
    {
        if ((int) $wave->project_id !== (int) $project->id) {
            abort(404);
        }

        $data = $request->validate([
            'scope_ids' => ['required', 'array', 'min:1'],
            'scope_ids.*' => ['integer', 'exists:project_scopes,id'],
        ]);

        $updated = $this->waves->assignScopes($wave, $data['scope_ids']);

        return response()->json([
            'data' => $this->wavePayload($updated),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function wavePayload(ProjectWave $wave): array
    {
        $wave->loadMissing('scopes');

        return [
            'id' => $wave->id,
            'project_id' => $wave->project_id,
            'wave_number' => $wave->wave_number,
            'label' => $wave->label,
            'status' => $wave->status?->value ?? $wave->status,
            'stage' => $wave->stage,
            'completion_percent' => $wave->completion_percent,
            'scopes' => $wave->scopes->map(fn ($scope) => [
                'id' => $scope->id,
                'type' => $scope->type?->value ?? $scope->type,
                'label' => $scope->label,
                'parent_id' => $scope->parent_id,
                'project_floor_id' => $scope->project_floor_id,
                'room_key' => $scope->room_key,
                'completion_percent' => $scope->completion_percent,
                'openings_total' => $scope->openings_total,
                'openings_done' => $scope->openings_done,
            ])->values()->all(),
        ];
    }
}
