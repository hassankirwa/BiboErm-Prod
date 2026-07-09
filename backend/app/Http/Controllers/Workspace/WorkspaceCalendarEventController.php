<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\WorkspaceCalendarEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceCalendarEventController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', \App\Models\CrmActivity::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'event_type' => ['nullable', 'string', 'max:64'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'location' => ['nullable', 'string', 'max:500'],
            'visibility' => ['nullable', 'string', 'in:private,team,all'],
        ]);

        $user = $request->user();

        $event = WorkspaceCalendarEvent::query()->create([
            ...$validated,
            'event_type' => $validated['event_type'] ?? 'custom',
            'assigned_to' => $validated['assigned_to'] ?? $user->id,
            'created_by' => $user->id,
            'visibility' => $validated['visibility'] ?? 'private',
        ]);

        return response()->json([
            'data' => $event->load('assignee'),
        ], 201);
    }

    public function update(Request $request, WorkspaceCalendarEvent $workspaceCalendarEvent): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $workspaceCalendarEvent->created_by === $user->id
            || $workspaceCalendarEvent->assigned_to === $user->id
            || $user->can('activities.view_all'),
            403,
        );

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'event_type' => ['nullable', 'string', 'max:64'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'location' => ['nullable', 'string', 'max:500'],
            'visibility' => ['nullable', 'string', 'in:private,team,all'],
        ]);

        $workspaceCalendarEvent->update($validated);

        return response()->json([
            'data' => $workspaceCalendarEvent->fresh()->load('assignee'),
        ]);
    }

    public function destroy(Request $request, WorkspaceCalendarEvent $workspaceCalendarEvent): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $workspaceCalendarEvent->created_by === $user->id
            || $workspaceCalendarEvent->assigned_to === $user->id
            || $user->can('activities.view_all'),
            403,
        );

        $workspaceCalendarEvent->delete();

        return response()->json(['message' => 'Event deleted.']);
    }
}
