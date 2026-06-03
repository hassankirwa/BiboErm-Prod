<?php

namespace App\Http\Controllers\Projects;

use App\Events\Projects\ProjectAddonRequested;
use App\Http\Controllers\Controller;
use App\Enums\ProjectStage;
use App\Models\Project;
use App\Models\ProjectBomLine;
use App\Models\ProjectDelay;
use App\Models\ProjectEngineer;
use App\Models\ProjectFloor;
use App\Services\Projects\ProjectMaterialStatusService;
use App\Services\Projects\ProjectStageService;
use App\Services\Warehouse\Reservations\ProjectMaterialReservationOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProjectOperationsController extends Controller
{
    public function __construct(
        protected ProjectMaterialStatusService $materialStatus,
        protected ProjectStageService $stages,
        protected ProjectMaterialReservationOrchestrator $reservations,
    ) {}

    public function materialStatus(Project $project): JsonResponse
    {
        $this->authorize('viewMaterialStatus', $project);

        return response()->json([
            'data' => $this->materialStatus->build($project),
        ]);
    }

    public function reserveMaterials(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewMaterialStatus', $project);
        abort_unless(
            $request->user()->can('warehouse.reservations.create') || $request->user()->can('projects.manage'),
            403
        );

        $current = $this->stages->currentStage($project);

        if (! in_array($current, [ProjectStage::MaterialCheck, ProjectStage::MaterialsReserved], true)) {
            throw ValidationException::withMessages([
                'stage' => ['Materials can only be reserved while the project is awaiting warehouse reservation.'],
            ]);
        }

        $project->loadMissing('latestBom.lines');
        $bom = $project->latestBom;

        if (! $bom || $bom->status !== 'finalized') {
            throw ValidationException::withMessages([
                'bom' => ['Finalize the project BOM before reserving materials.'],
            ]);
        }

        $bomLines = $bom->lines
            ->filter(fn (ProjectBomLine $line) => ! $line->is_procurement_only && (bool) $line->warehouse_item_id)
            ->map(fn (ProjectBomLine $line) => [
                'item_id' => (int) $line->warehouse_item_id,
                'quantity' => (string) $line->quantity,
                'project_bom_line_id' => $line->id,
                'required_length_mm' => $line->measurement_mm,
                'bom_line_ref' => (string) $line->id,
            ])
            ->values()
            ->all();

        if ($bomLines === []) {
            throw ValidationException::withMessages([
                'bom' => ['No warehouse stock lines on the finalized BOM to reserve.'],
            ]);
        }

        $result = $this->reservations->process(
            projectId: $project->id,
            user: $request->user(),
            bomLines: $bomLines,
            notes: $request->input('notes'),
            emitEvents: true,
        );

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'message' => 'Material shortage detected — reservation blocked.',
                'check' => $result['check'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'project' => [
                'id' => $project->id,
                'stage' => $this->stages->currentStage($project->fresh())->value,
            ],
            'check' => $result['check'],
            'reservation' => [
                'id' => $result['reservation']->id,
                'fifo_sequence' => $result['reservation']->fifo_sequence,
                'status' => $result['reservation']->status,
            ],
        ]);
    }

    public function materialShortages(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);
        abort_unless(
            $request->user()->can('projects.material_status.view') || $request->user()->can('projects.manage'),
            403
        );

        $projects = Project::query()
            ->visibleTo($request->user())
            ->with(['account', 'projectManager', 'latestBom'])
            ->whereNotIn('stage', [ProjectStage::ProjectComplete->value])
            ->latest()
            ->get();

        $data = [];

        foreach ($projects as $project) {
            $status = $this->materialStatus->build($project);

            $shortageLines = collect($status['lines'] ?? [])
                ->filter(function (array $line) {
                    if (bccomp((string) ($line['shortage_qty'] ?? '0'), '0.000', 3) === 1) {
                        return true;
                    }

                    return (bool) ($line['is_procurement_only'] ?? false);
                })
                ->values()
                ->all();

            if ($shortageLines === []) {
                continue;
            }

            $data[] = [
                'project' => [
                    'id' => $project->id,
                    'reference' => $project->reference,
                    'name' => $project->name,
                    'stage' => $project->stage?->value ?? $project->stage,
                    'priority' => $project->priority,
                    'account' => $project->account ? [
                        'id' => $project->account->id,
                        'name' => $project->account->name,
                    ] : null,
                    'project_manager' => $project->projectManager ? [
                        'id' => $project->projectManager->id,
                        'name' => $project->projectManager->name,
                    ] : null,
                    'bom' => $project->latestBom ? [
                        'id' => $project->latestBom->id,
                        'version' => $project->latestBom->version,
                        'status' => $project->latestBom->status,
                    ] : null,
                ],
                'summary' => $status['summary'] ?? [],
                'shortage_lines' => $shortageLines,
                'actionable_lines' => array_values(array_filter(
                    $shortageLines,
                    fn (array $line) => (bool) ($line['can_create_requisition'] ?? false)
                )),
                'requisitioned_lines' => array_values(array_filter(
                    $shortageLines,
                    fn (array $line) => ! empty($line['requisition_ids'] ?? [])
                )),
            ];
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'total_projects' => count($data),
            ],
        ]);
    }

    public function storeDelay(Request $request, Project $project): JsonResponse
    {
        $this->authorize('logDelay', $project);

        $validated = $request->validate([
            'stage' => ['required', 'string', 'max:64'],
            'reason' => ['required', 'string', 'max:50'],
            'days_lost' => ['required', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $delay = ProjectDelay::query()->create([
            ...$validated,
            'project_id' => $project->id,
            'logged_by' => $request->user()->id,
            'logged_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'id' => $delay->id,
                'project_id' => $delay->project_id,
                'stage' => $delay->stage,
                'reason' => $delay->reason,
                'days_lost' => $delay->days_lost,
                'notes' => $delay->notes,
                'logged_at' => $delay->logged_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function floors(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'data' => $project->floors()->get()->map(fn (ProjectFloor $floor) => [
                'id' => $floor->id,
                'project_id' => $floor->project_id,
                'floor_label' => $floor->floor_label,
                'section_notes' => $floor->section_notes,
                'completion_percent' => $floor->completion_percent,
                'sort_order' => $floor->sort_order,
            ])->all(),
        ]);
    }

    public function storeFloor(Request $request, Project $project): JsonResponse
    {
        $this->authorize('manageFloors', $project);

        $validated = $request->validate([
            'floor_label' => ['required', 'string', 'max:100'],
            'section_notes' => ['nullable', 'string'],
            'completion_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $floor = ProjectFloor::query()->create([
            ...$validated,
            'project_id' => $project->id,
            'completion_percent' => $validated['completion_percent'] ?? 0,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json([
            'data' => [
                'id' => $floor->id,
                'project_id' => $floor->project_id,
                'floor_label' => $floor->floor_label,
                'section_notes' => $floor->section_notes,
                'completion_percent' => $floor->completion_percent,
                'sort_order' => $floor->sort_order,
            ],
        ], 201);
    }

    public function engineers(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $engineers = $project->engineers()->with('user')->get();

        return response()->json([
            'data' => $engineers->map(fn (ProjectEngineer $engineer) => [
                'id' => $engineer->id,
                'project_id' => $engineer->project_id,
                'role' => $engineer->role,
                'assigned_at' => $engineer->assigned_at?->toIso8601String(),
                'user' => $engineer->user ? [
                    'id' => $engineer->user->id,
                    'name' => $engineer->user->name,
                    'email' => $engineer->user->email,
                ] : null,
            ])->all(),
        ]);
    }

    public function storeEngineer(Request $request, Project $project): JsonResponse
    {
        $this->authorize('assignEngineers', $project);

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role' => ['nullable', 'string', 'max:50'],
        ]);

        $engineer = ProjectEngineer::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'user_id' => $validated['user_id'],
                'role' => $validated['role'] ?? 'engineer',
            ],
            [
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
                'removed_at' => null,
            ]
        );

        return response()->json([
            'data' => [
                'id' => $engineer->id,
                'project_id' => $engineer->project_id,
                'user_id' => $engineer->user_id,
                'role' => $engineer->role,
                'assigned_at' => $engineer->assigned_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function destroyEngineer(Project $project, ProjectEngineer $engineer): JsonResponse
    {
        $this->authorize('assignEngineers', $project);

        if ((int) $engineer->project_id !== $project->id) {
            abort(404);
        }

        $engineer->forceFill(['removed_at' => now()])->save();

        return response()->json(['data' => ['removed' => true]]);
    }

    public function addAddon(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.addons.create') || $request->user()->can('projects.manage'), 403);

        $validated = $request->validate([
            'description' => ['required', 'string'],
            'client_requested' => ['sometimes', 'boolean'],
        ]);

        ProjectAddonRequested::dispatch(
            projectId: $project->id,
            requestedByUserId: $request->user()->id,
            description: $validated['description'],
            clientRequested: (bool) ($validated['client_requested'] ?? true),
        );

        return response()->json([
            'data' => [
                'project_id' => $project->id,
                'description' => $validated['description'],
                'client_requested' => (bool) ($validated['client_requested'] ?? true),
                'status' => 'requested',
            ],
        ], 201);
    }
}
