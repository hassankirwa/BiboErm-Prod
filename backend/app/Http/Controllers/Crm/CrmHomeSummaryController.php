<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\LeadResource;
use App\Http\Resources\Crm\SiteVisitResource;
use App\Models\CrmActivity;
use App\Models\Deal;
use App\Models\FieldDay;
use App\Models\Lead;
use App\Models\SiteVisit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrmHomeSummaryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $user = $request->user();
        $leadQuery = Lead::query()->visibleTo($user);
        $dealQuery = Deal::query()->visibleTo($user);
        $visitQuery = SiteVisit::query()->visibleTo($user);

        $openDealsQuery = (clone $dealQuery)->where('status', 'open');

        $pipelineValue = (clone $openDealsQuery)->sum(
            DB::raw('COALESCE(NULLIF(estimated_value, 0), NULLIF(amount, 0), 0)')
        );

        $recentLeads = (clone $leadQuery)
            ->with(['leadOwner', 'assignedSalesUser', 'leadSource'])
            ->latest()
            ->limit(10)
            ->get();

        $upcomingVisits = (clone $visitQuery)
            ->with(['assignedFieldOfficer'])
            ->latest()
            ->limit(5)
            ->get();

        $openTasks = CrmActivity::query()
            ->with(['assignee'])
            ->where('status', '!=', 'completed')
            ->latest()
            ->limit(5)
            ->get();

        $fieldDaysToday = [];
        if ($user->can('field_day.view')) {
            $fieldDayQuery = FieldDay::query()
                ->with(['fieldOfficer', 'pins'])
                ->whereDate('field_date', now()->toDateString())
                ->latest('field_date');

            if (! $user->can('field_day.manage')) {
                $fieldDayQuery->where(function ($q) use ($user) {
                    $q->where('field_officer_id', $user->id)
                        ->orWhere('created_by', $user->id);
                });
            }

            $fieldDaysToday = $fieldDayQuery->limit(10)->get();
        }

        return response()->json([
            'data' => [
                'stats' => [
                    'leads' => (clone $leadQuery)->count(),
                    'deals' => (clone $dealQuery)->where('status', 'open')->count(),
                    'visits' => (clone $visitQuery)->count(),
                    'pipeline_value' => (float) $pipelineValue,
                ],
                'open_tasks' => $openTasks,
                'upcoming_visits' => SiteVisitResource::collection($upcomingVisits)->resolve(),
                'recent_leads' => LeadResource::collection($recentLeads)->resolve(),
                'field_days_today' => $fieldDaysToday->map(fn (FieldDay $fieldDay) => [
                    'id' => $fieldDay->id,
                    'field_officer_id' => $fieldDay->field_officer_id,
                    'field_officer' => $fieldDay->fieldOfficer ? [
                        'id' => $fieldDay->fieldOfficer->id,
                        'name' => $fieldDay->fieldOfficer->name,
                    ] : null,
                    'pins' => $fieldDay->pins->map(fn ($pin) => [
                        'id' => $pin->id,
                        'lead_id' => $pin->lead_id,
                    ])->values(),
                ])->values(),
            ],
        ]);
    }
}
