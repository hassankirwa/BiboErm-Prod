<?php

namespace App\Services\Crm;

use App\Enums\Crm\SiteVisitStatus;
use App\Models\CrmActivity;
use App\Models\SiteVisit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CrmCalendarService
{
    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function eventsForRange(
        Carbon $from,
        Carbon $to,
        User $user,
        ?int $assignedTo = null,
        ?int $accountId = null,
        ?int $leadId = null,
    ): Collection {
        $assigneeId = $assignedTo ?? $user->id;
        $canViewAll = $user->can('activities.view_all');

        $activityQuery = CrmActivity::query()
            ->with(['assignee', 'lead', 'account', 'deal'])
            ->whereIn('status', ['pending', 'overdue'])
            ->whereNotNull('scheduled_start_at')
            ->whereBetween('scheduled_start_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->when(! $canViewAll, fn ($q) => $q->where('assigned_to', $assigneeId))
            ->when($canViewAll && $assignedTo, fn ($q) => $q->where('assigned_to', $assignedTo))
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId))
            ->when($leadId, fn ($q) => $q->where('lead_id', $leadId));

        $activityEvents = $activityQuery->get()->map(fn (CrmActivity $activity) => [
            'id' => 'activity-'.$activity->id,
            'source' => 'crm_activity',
            'source_id' => $activity->id,
            'type' => $activity->activity_type ?? $activity->type,
            'title' => $activity->subject,
            'subtitle' => $activity->lead?->name ?? $activity->account?->name,
            'starts_at' => $activity->scheduled_start_at?->toIso8601String(),
            'ends_at' => ($activity->scheduled_end_at ?? $activity->scheduled_start_at?->copy()->addMinutes(30))?->toIso8601String(),
            'assigned_to' => $activity->assignee ? [
                'id' => $activity->assignee->id,
                'name' => $activity->assignee->name,
            ] : null,
            'lead_id' => $activity->lead_id,
            'account_id' => $activity->account_id,
            'deal_id' => $activity->deal_id,
            'location' => $activity->location,
            'status' => $activity->status,
            'href' => $activity->lead_id
                ? '/crm/leads/'.$activity->lead_id
                : ($activity->account_id ? '/crm/accounts/'.$activity->account_id : null),
        ]);

        $visitQuery = SiteVisit::query()
            ->with(['assignedFieldOfficer', 'account', 'lead'])
            ->where('status', '!=', SiteVisitStatus::Cancelled->value)
            ->whereBetween('visit_date', [$from->toDateString(), $to->toDateString()])
            ->when(! $canViewAll, fn ($q) => $q->where('assigned_field_officer_id', $assigneeId))
            ->when($canViewAll && $assignedTo, fn ($q) => $q->where('assigned_field_officer_id', $assignedTo))
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId))
            ->when($leadId, fn ($q) => $q->where('lead_id', $leadId));

        $visitEvents = $visitQuery->get()->map(function (SiteVisit $visit) {
            $start = Carbon::parse($visit->visit_date.' '.($visit->visit_time ?? '09:00:00'));

            return [
                'id' => 'site-visit-'.$visit->id,
                'source' => 'site_visit',
                'source_id' => $visit->id,
                'type' => 'site_visit',
                'title' => $visit->title,
                'subtitle' => $visit->site_address,
                'starts_at' => $start->toIso8601String(),
                'ends_at' => $start->copy()->addHours(2)->toIso8601String(),
                'assigned_to' => $visit->assignedFieldOfficer ? [
                    'id' => $visit->assignedFieldOfficer->id,
                    'name' => $visit->assignedFieldOfficer->name,
                ] : null,
                'lead_id' => $visit->lead_id,
                'account_id' => $visit->account_id,
                'location' => $visit->site_address,
                'status' => $visit->status instanceof SiteVisitStatus ? $visit->status->value : $visit->status,
                'href' => '/crm/site-visits/'.$visit->id,
            ];
        });

        return $activityEvents->concat($visitEvents)->sortBy('starts_at')->values();
    }
}
