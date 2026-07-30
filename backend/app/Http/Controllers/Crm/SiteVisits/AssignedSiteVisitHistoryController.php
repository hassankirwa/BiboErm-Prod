<?php

namespace App\Http\Controllers\Crm\SiteVisits;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\SiteVisit;
use App\Support\Crm\SiteVisitMeasurementContextFilter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AssignedSiteVisitHistoryController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SiteVisit::class);

        $query = SiteVisit::query()
            ->where(function ($assigned) use ($request): void {
                $assigned
                    ->where('assigned_field_officer_id', $request->user()->id)
                    ->orWhere('assigned_to_user_id', $request->user()->id);
            })
            ->whereIn('status', [
                'submitted_for_review',
                'clarification_needed',
                'approved',
                'revisit_required',
                'no_access',
                'cancelled',
            ])
            ->with([
                'lead',
                'deal.account',
                'project',
                'assignedFieldOfficer',
                'reviewedBy',
            ])
            ->latest('updated_at');

        SiteVisitMeasurementContextFilter::apply(
            $query,
            $request->query('measurement_context'),
        );

        return SiteVisitResource::collection(
            $query->paginate($request->integer('per_page', 25)),
        );
    }
}
