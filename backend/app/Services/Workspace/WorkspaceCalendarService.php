<?php

namespace App\Services\Workspace;

use App\Enums\Crm\SiteVisitStatus;
use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\ProjectStage;
use App\Models\CrmActivity;
use App\Models\FieldDayPin;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Models\User;
use App\Models\WorkspaceCalendarEvent;
use App\Support\Crm\SiteVisitSchedule;
use App\Support\Workspace\WorkspaceAssigneeScope;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WorkspaceCalendarService
{
    public function __construct(
        protected WorkspaceAssigneeScope $assigneeScope,
    ) {}

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
        ?string $role = null,
        ?int $departmentId = null,
        ?string $source = null,
    ): Collection {
        $scope = $this->assigneeScope->resolve($user, $assignedTo, $role, $departmentId);
        $events = collect();

        if ($source === null || $source === 'crm_activity') {
            if ($user->can('activities.view') || $user->can('crm.view')) {
                $events = $events->concat($this->activityEvents($from, $to, $scope, $accountId, $leadId));
            }
        }

        if ($source === null || $source === 'site_visit') {
            if ($user->can('site_visits.view') || $user->can('site_visits.execute') || $user->can('crm.view')) {
                $events = $events->concat($this->siteVisitEvents($from, $to, $scope, $accountId, $leadId));
            }
        }

        if ($source === null || $source === 'field_installation') {
            if ($user->can('field_installation.view') || $user->can('field_installation.log')) {
                $events = $events->concat($this->fieldInstallationEvents($from, $to, $user, $scope));
            }
        }

        if ($source === null || $source === 'field_day_pin') {
            if ($user->can('field_day.view')) {
                $events = $events->concat($this->fieldDayPinEvents($from, $to, $user, $scope));
            }
        }

        if ($source === null || $source === 'project') {
            if ($user->can('projects.view') || $user->can('projects.manage')) {
                $events = $events->concat($this->projectEvents($from, $to, $user, $scope));
            }
        }

        if ($source === null || $source === 'workspace_event') {
            $events = $events->concat($this->customEvents($from, $to, $scope));
        }

        return $events->sortBy('starts_at')->values();
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function activityEvents(
        Carbon $from,
        Carbon $to,
        array $scope,
        ?int $accountId,
        ?int $leadId,
    ): Collection {
        $query = CrmActivity::query()
            ->with(['assignee', 'lead', 'account', 'deal'])
            ->whereIn('status', ['pending', 'overdue'])
            ->whereNotNull('scheduled_start_at')
            ->whereBetween('scheduled_start_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId))
            ->when($leadId, fn ($q) => $q->where('lead_id', $leadId));

        $this->assigneeScope->applyUserFilter($query, 'assigned_to', $scope);

        return $query->get()->map(fn (CrmActivity $activity) => [
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
                : ($activity->account_id ? '/crm/accounts/'.$activity->account_id : '/workspace/tasks'),
        ]);
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function siteVisitEvents(
        Carbon $from,
        Carbon $to,
        array $scope,
        ?int $accountId,
        ?int $leadId,
    ): Collection {
        $query = SiteVisit::query()
            ->with(['assignedFieldOfficer', 'account', 'lead'])
            ->where('status', '!=', SiteVisitStatus::Cancelled->value)
            ->whereBetween('visit_date', [$from->toDateString(), $to->toDateString()])
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId))
            ->when($leadId, fn ($q) => $q->where('lead_id', $leadId));

        $this->assigneeScope->applyUserFilter($query, 'assigned_field_officer_id', $scope);

        return $query->get()->map(function (SiteVisit $visit) {
            $start = SiteVisitSchedule::startsAt($visit);

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
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function fieldInstallationEvents(Carbon $from, Carbon $to, User $user, array $scope): Collection
    {
        $query = FieldInstallationJob::query()
            ->with(['teamLead', 'project', 'activeMembers.user'])
            ->whereNotIn('status', [FieldJobStatus::Completed->value, FieldJobStatus::Cancelled->value])
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('scheduled_start', [$from->toDateString(), $to->toDateString()])
                    ->orWhereBetween('scheduled_end', [$from->toDateString(), $to->toDateString()]);
            });

        if ($scope['assignee_id'] !== null) {
            $userId = $scope['assignee_id'];
            $query->where(function ($q) use ($userId) {
                $q->where('team_lead_id', $userId)
                    ->orWhereHas('activeMembers', fn ($m) => $m->where('user_id', $userId));
            });
        } elseif ($scope['user_ids'] !== null) {
            $userIds = $scope['user_ids'];
            $query->where(function ($q) use ($userIds) {
                $q->whereIn('team_lead_id', $userIds)
                    ->orWhereHas('activeMembers', fn ($m) => $m->whereIn('user_id', $userIds));
            });
        } elseif (! $scope['can_view_all']) {
            $userId = $user->id;
            $query->where(function ($q) use ($userId) {
                $q->where('team_lead_id', $userId)
                    ->orWhereHas('activeMembers', fn ($m) => $m->where('user_id', $userId));
            });
        }

        return $query->get()->map(function (FieldInstallationJob $job) {
            $start = Carbon::parse($job->scheduled_start ?? now())->setTime(8, 0);
            $endDate = $job->scheduled_end ?? $job->scheduled_start ?? now();
            $end = Carbon::parse($endDate)->setTime(17, 0);

            return [
                'id' => 'field-job-'.$job->id,
                'source' => 'field_installation',
                'source_id' => $job->id,
                'type' => 'field_installation',
                'title' => $job->reference.' — '.$job->project?->name,
                'subtitle' => $job->site_address ?? $job->project?->site_address,
                'starts_at' => $start->toIso8601String(),
                'ends_at' => $end->toIso8601String(),
                'assigned_to' => $job->teamLead ? [
                    'id' => $job->teamLead->id,
                    'name' => $job->teamLead->name,
                ] : null,
                'lead_id' => null,
                'account_id' => $job->project?->account_id,
                'location' => $job->site_address,
                'status' => $job->status?->value ?? $job->status,
                'href' => '/field-installation/jobs/'.$job->id,
            ];
        });
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function fieldDayPinEvents(Carbon $from, Carbon $to, User $user, array $scope): Collection
    {
        $query = FieldDayPin::query()
            ->with(['fieldDay.fieldOfficer', 'lead'])
            ->whereBetween('captured_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()]);

        if ($scope['assignee_id'] !== null || $scope['user_ids'] !== null) {
            $query->whereHas('fieldDay', function ($q) use ($scope) {
                if ($scope['assignee_id'] !== null) {
                    $q->where('field_officer_id', $scope['assignee_id']);
                } elseif ($scope['user_ids'] !== null) {
                    $q->whereIn('field_officer_id', $scope['user_ids']);
                }
            });
        } elseif (! $scope['can_view_all']) {
            $query->whereHas('fieldDay', fn ($q) => $q->where('field_officer_id', $user->id));
        }

        return $query->get()->map(function (FieldDayPin $pin) {
            $start = $pin->captured_at ?? now();
            $officer = $pin->fieldDay?->fieldOfficer;

            return [
                'id' => 'field-pin-'.$pin->id,
                'source' => 'field_day_pin',
                'source_id' => $pin->id,
                'type' => 'field_day_pin',
                'title' => $pin->site_label ?? 'Field capture',
                'subtitle' => $pin->location_address ?? $pin->lead?->name,
                'starts_at' => $start->toIso8601String(),
                'ends_at' => $start->copy()->addMinutes(30)->toIso8601String(),
                'assigned_to' => $officer ? [
                    'id' => $officer->id,
                    'name' => $officer->name,
                ] : null,
                'lead_id' => $pin->lead_id,
                'account_id' => null,
                'location' => $pin->location_address,
                'status' => $pin->lead_id ? 'converted' : 'captured',
                'href' => $pin->lead_id ? '/crm/leads/'.$pin->lead_id : '/crm/field-day',
            ];
        });
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function projectEvents(Carbon $from, Carbon $to, User $user, array $scope): Collection
    {
        $query = Project::query()
            ->visibleTo($user)
            ->with(['projectManager', 'account'])
            ->where('stage', '!=', ProjectStage::ProjectComplete->value)
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('projected_end', [$from->toDateString(), $to->toDateString()])
                    ->orWhereBetween('projected_start', [$from->toDateString(), $to->toDateString()]);
            });

        if ($scope['assignee_id'] !== null) {
            $userId = $scope['assignee_id'];
            $query->where(function ($q) use ($userId) {
                $q->where('project_manager_id', $userId)
                    ->orWhere('sales_rep_id', $userId)
                    ->orWhereHas('engineerAssignments', fn ($e) => $e->where('user_id', $userId)->whereNull('removed_at'));
            });
        } elseif ($scope['user_ids'] !== null) {
            $userIds = $scope['user_ids'];
            $query->where(function ($q) use ($userIds) {
                $q->whereIn('project_manager_id', $userIds)
                    ->orWhereIn('sales_rep_id', $userIds)
                    ->orWhereHas('engineerAssignments', fn ($e) => $e->whereIn('user_id', $userIds)->whereNull('removed_at'));
            });
        }

        return $query->get()->flatMap(function (Project $project) {
            $events = collect();
            $assignee = $project->projectManager;

            if ($project->projected_start) {
                $start = Carbon::parse($project->projected_start)->setTime(9, 0);
                $events->push([
                    'id' => 'project-start-'.$project->id,
                    'source' => 'project',
                    'source_id' => $project->id,
                    'type' => 'project_milestone',
                    'title' => $project->reference.' — Start',
                    'subtitle' => $project->name,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $start->copy()->addHour()->toIso8601String(),
                    'assigned_to' => $assignee ? ['id' => $assignee->id, 'name' => $assignee->name] : null,
                    'lead_id' => null,
                    'account_id' => $project->account_id,
                    'location' => $project->site_address,
                    'status' => $project->stage?->value ?? $project->stage,
                    'href' => '/projects/'.$project->id,
                ]);
            }

            if ($project->projected_end) {
                $end = Carbon::parse($project->projected_end)->setTime(9, 0);
                $events->push([
                    'id' => 'project-end-'.$project->id,
                    'source' => 'project',
                    'source_id' => $project->id,
                    'type' => 'project_milestone',
                    'title' => $project->reference.' — Target end',
                    'subtitle' => $project->name,
                    'starts_at' => $end->toIso8601String(),
                    'ends_at' => $end->copy()->addHour()->toIso8601String(),
                    'assigned_to' => $assignee ? ['id' => $assignee->id, 'name' => $assignee->name] : null,
                    'lead_id' => null,
                    'account_id' => $project->account_id,
                    'location' => $project->site_address,
                    'status' => $project->stage?->value ?? $project->stage,
                    'href' => '/projects/'.$project->id,
                ]);
            }

            return $events;
        });
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function customEvents(Carbon $from, Carbon $to, array $scope): Collection
    {
        $query = WorkspaceCalendarEvent::query()
            ->with(['assignee'])
            ->whereBetween('starts_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()]);

        $this->assigneeScope->applyUserFilter($query, 'assigned_to', $scope);

        return $query->get()->map(fn (WorkspaceCalendarEvent $event) => [
            'id' => 'workspace-event-'.$event->id,
            'source' => 'workspace_event',
            'source_id' => $event->id,
            'type' => $event->event_type ?? 'custom',
            'title' => $event->title,
            'subtitle' => $event->description,
            'starts_at' => $event->starts_at?->toIso8601String(),
            'ends_at' => ($event->ends_at ?? $event->starts_at?->copy()->addHour())?->toIso8601String(),
            'assigned_to' => $event->assignee ? [
                'id' => $event->assignee->id,
                'name' => $event->assignee->name,
            ] : null,
            'lead_id' => null,
            'account_id' => null,
            'location' => $event->location,
            'status' => 'scheduled',
            'href' => '/workspace/calendar',
        ]);
    }
}
