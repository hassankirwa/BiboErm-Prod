<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Services\Workspace\WorkspaceCalendarService;
use App\Support\Workspace\WorkspaceAssigneeScope;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceCalendarController extends Controller
{
    public function __construct(
        protected WorkspaceCalendarService $calendar,
        protected WorkspaceAssigneeScope $assigneeScope,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\CrmActivity::class);

        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'account_id' => ['nullable', 'integer', 'exists:accounts,id'],
            'lead_id' => ['nullable', 'integer', 'exists:leads,id'],
            'role' => ['nullable', 'string', 'max:64'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'source' => ['nullable', 'string', 'max:64'],
        ]);

        $events = $this->calendar->eventsForRange(
            Carbon::parse($validated['from']),
            Carbon::parse($validated['to']),
            $request->user(),
            $validated['assigned_to'] ?? null,
            $validated['account_id'] ?? null,
            $validated['lead_id'] ?? null,
            $validated['role'] ?? null,
            isset($validated['department_id']) ? (int) $validated['department_id'] : null,
            $validated['source'] ?? null,
        );

        return response()->json([
            'data' => $events,
            'workload' => $this->assigneeScope->workloadFromEvents($events),
        ]);
    }
}
