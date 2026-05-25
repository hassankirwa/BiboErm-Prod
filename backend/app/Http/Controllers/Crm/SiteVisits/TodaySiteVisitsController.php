<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TodaySiteVisitsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SiteVisit::class);

        $visits = SiteVisit::query()
            ->where('assigned_field_officer_id', $request->user()->id)
            ->whereDate('visit_date', today())
            ->with(['lead', 'deal', 'measurementLines'])
            ->orderBy('visit_time')
            ->get();

        return SiteVisitResource::collection($visits);
    }
}
