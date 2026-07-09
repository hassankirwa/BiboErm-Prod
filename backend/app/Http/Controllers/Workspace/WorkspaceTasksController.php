<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Services\Workspace\WorkspaceTasksService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceTasksController extends Controller
{
    public function __construct(
        protected WorkspaceTasksService $tasks,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\CrmActivity::class);

        $validated = $request->validate([
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'type' => ['nullable', 'string', 'max:64'],
            'status' => ['nullable', 'string', 'max:32'],
            'due_before' => ['nullable', 'date'],
            'role' => ['nullable', 'string', 'max:64'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $result = $this->tasks->tasksForUser(
            $request->user(),
            $validated['assigned_to'] ?? null,
            $validated['type'] ?? null,
            $validated['status'] ?? null,
            $validated['due_before'] ?? null,
            $validated['role'] ?? null,
            isset($validated['department_id']) ? (int) $validated['department_id'] : null,
        );

        return response()->json([
            'data' => $result['data'],
            'meta' => ['total' => $result['total']],
        ]);
    }
}
