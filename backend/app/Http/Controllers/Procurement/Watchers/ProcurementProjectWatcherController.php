<?php

namespace App\Http\Controllers\Procurement\Watchers;

use App\Http\Controllers\Controller;
use App\Models\Procurement\ProcurementProjectWatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProcurementProjectWatcherController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ProcurementProjectWatcher::class);

        $query = ProcurementProjectWatcher::query()->with(['project', 'notifyUser'])->latest();
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        return response()->json(['data' => $query->paginate($request->integer('per_page', 25))]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ProcurementProjectWatcher::class);

        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'notify_at_stage' => ['required', 'string', 'max:50'],
            'notify_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'is_active' => ['boolean'],
        ]);

        $watcher = ProcurementProjectWatcher::query()->create([
            ...$validated,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $watcher->load('project')], 201);
    }
}
