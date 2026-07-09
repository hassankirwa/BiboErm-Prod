<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Services\Workspace\WorkspaceTodayService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceTodayController extends Controller
{
    public function __construct(
        protected WorkspaceTodayService $today,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\CrmActivity::class);

        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'role' => ['nullable', 'string', 'max:64'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $date = isset($validated['date'])
            ? Carbon::parse($validated['date'])
            : Carbon::today();

        $data = $this->today->summaryForDate(
            $request->user(),
            $date,
            $validated['user_id'] ?? null,
            $validated['role'] ?? null,
            isset($validated['department_id']) ? (int) $validated['department_id'] : null,
        );

        return response()->json(['data' => $data]);
    }
}
