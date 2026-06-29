<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Enums\Crm\SiteVisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OpenAssignedSiteVisitsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SiteVisit::class);

        $openStatuses = [
            SiteVisitStatus::Scheduled->value,
            SiteVisitStatus::Assigned->value,
            SiteVisitStatus::InProgress->value,
            SiteVisitStatus::MeasurementsCaptured->value,
        ];

        $visits = SiteVisit::query()
            ->where('assigned_field_officer_id', $request->user()->id)
            ->whereIn('status', $openStatuses)
            ->with([
                'lead',
                'deal.account',
                'deal.contact',
                'deal.assignedFieldOfficer',
                'project',
                'assignedFieldOfficer',
            ])
            ->orderBy('visit_date')
            ->orderBy('visit_time')
            ->get();

        return SiteVisitResource::collection($visits);
    }
}
