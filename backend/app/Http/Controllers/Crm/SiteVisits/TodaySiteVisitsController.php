<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Support\Crm\SiteVisitMeasurementContextFilter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TodaySiteVisitsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SiteVisit::class);

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'measurement_context' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $assigneeId = $validated['user_id'] ?? $user->id;

        if ($assigneeId !== $user->id && ! $user->can('site_visits.view_all')) {
            abort(403, 'You cannot view another user\'s visits.');
        }

        $query = SiteVisit::query()
            ->where('assigned_field_officer_id', $assigneeId)
            ->whereDate('visit_date', today())
            ->with(['lead', 'deal', 'measurementLines'])
            ->orderBy('visit_time');

        SiteVisitMeasurementContextFilter::apply(
            $query,
            $validated['measurement_context'] ?? $request->query('measurement_context'),
        );

        $visits = $query->get();

        return SiteVisitResource::collection($visits);
    }
}
