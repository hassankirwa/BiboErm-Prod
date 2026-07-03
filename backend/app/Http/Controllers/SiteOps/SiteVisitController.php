<?php

namespace App\Http\Controllers\SiteOps;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Support\Crm\SiteVisitMeasurementContextFilter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SiteVisitController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SiteVisit::class);

        $query = SiteVisit::query()
            ->visibleTo($request->user())
            ->with(['lead', 'assignedToUser', 'assignedFieldOfficer'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($visitType = $request->query('visit_type')) {
            $query->where('visit_type', $visitType);
        }

        SiteVisitMeasurementContextFilter::apply(
            $query,
            $request->query('measurement_context'),
        );

        return SiteVisitResource::collection(
            $query->paginate($request->integer('per_page', 25))
        );
    }

    public function show(SiteVisit $siteVisit): SiteVisitResource
    {
        $this->authorize('view', $siteVisit);

        return new SiteVisitResource(
            $siteVisit->load([
                'lead',
                'assignedToUser',
                'assignedFieldOfficer',
                'measuredOpenings.photos',
                'measurementReports',
                'measurementLines',
                'photos',
            ])
        );
    }
}
