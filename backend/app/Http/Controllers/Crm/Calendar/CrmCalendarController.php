<?php

namespace App\Http\Controllers\Crm\Calendar;

use App\Http\Controllers\Controller;
use App\Services\Crm\CrmCalendarService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmCalendarController extends Controller
{
    public function __construct(
        protected CrmCalendarService $calendar,
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
        ]);

        $events = $this->calendar->eventsForRange(
            Carbon::parse($validated['from']),
            Carbon::parse($validated['to']),
            $request->user(),
            $validated['assigned_to'] ?? null,
            $validated['account_id'] ?? null,
            $validated['lead_id'] ?? null,
        );

        return response()->json(['data' => $events]);
    }
}
