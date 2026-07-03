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

        $query = SiteVisit::query()
            ->where('assigned_field_officer_id', $request->user()->id)
            ->whereDate('visit_date', today())
            ->with(['lead', 'deal', 'measurementLines'])
            ->orderBy('visit_time');

        SiteVisitMeasurementContextFilter::apply(
            $query,
            $request->query('measurement_context'),
        );

        $visits = $query->get();

        return SiteVisitResource::collection($visits);
    }
}
