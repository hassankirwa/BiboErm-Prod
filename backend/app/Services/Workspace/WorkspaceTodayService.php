<?php

namespace App\Services\Workspace;

use App\Enums\Crm\SiteVisitStatus;
use App\Enums\FieldInstallation\FieldJobStatus;
use App\Models\CrmActivity;
use App\Models\Deal;
use App\Models\FieldDay;
use App\Models\FieldDayPin;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Lead;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Projects\ProjectDashboardService;
use App\Support\Workspace\WorkspaceAssigneeScope;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class WorkspaceTodayService
{
    public function __construct(
        protected WorkspaceCalendarService $calendar,
        protected WorkspaceTasksService $tasks,
        protected ProjectDashboardService $projectDashboard,
        protected WorkspaceAssigneeScope $assigneeScope,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function summaryForDate(
        User $user,
        Carbon $date,
        ?int $userId = null,
        ?string $role = null,
        ?int $departmentId = null,
    ): array {
        $targetUserId = $userId ?? $user->id;
        $dateString = $date->toDateString();

        $leadQuery = Lead::query()->visibleTo($user);
        $visitQuery = SiteVisit::query()->visibleTo($user);
        $dealQuery = Deal::query()->visibleTo($user);

        $scope = $this->assigneeScope->resolve($user, $userId, $role, $departmentId);

        $siteVisitsToday = $this->siteVisitsForDate($user, $date, $scope);
        $schedule = $this->calendar->eventsForRange(
            $date->copy()->startOfDay(),
            $date->copy()->endOfDay(),
            $user,
            $userId,
            null,
            null,
            $role,
            $departmentId,
        )->values()->all();

        $openTasks = $this->tasks->tasksForUser(
            $user,
            $userId,
            null,
            'open',
            $dateString,
            $role,
            $departmentId,
        )['data']->take(10)->values()->all();

        $fieldInstallations = $this->fieldInstallationsForDate($user, $date, $scope);
        $clientsCaptured = $this->clientsCapturedForDate($user, $date, $scope);
        $fieldDay = $this->fieldDayForDate($user, $date, $scope);

        $projectQuery = \App\Models\Project::query()->visibleTo($user);
        if ($scope['assignee_id'] !== null) {
            $uid = $scope['assignee_id'];
            $projectQuery->where(function ($q) use ($uid) {
                $q->where('project_manager_id', $uid)
                    ->orWhere('sales_rep_id', $uid)
                    ->orWhereHas('engineerAssignments', fn ($e) => $e->where('user_id', $uid)->whereNull('removed_at'));
            });
        }

        $projectStats = $this->projectDashboard->summaryForVisibleProjects($projectQuery);

        $openDealsQuery = (clone $dealQuery)->where('status', 'open');
        $pipelineValue = (float) (clone $openDealsQuery)->sum(
            DB::raw('COALESCE(NULLIF(estimated_value, 0), NULLIF(amount, 0), 0)')
        );

        $meetingsToday = collect($schedule)->filter(
            fn (array $e) => str_contains($e['type'] ?? '', 'meeting')
        )->count();

        return [
            'date' => $dateString,
            'user_id' => $targetUserId,
            'stats' => [
                'site_visits_today' => (clone $visitQuery)
                    ->whereDate('visit_date', $dateString)
                    ->whereNotIn('status', [SiteVisitStatus::Cancelled->value, SiteVisitStatus::Approved->value])
                    ->count(),
                'open_leads' => (clone $leadQuery)
                    ->where(function ($q) {
                        $q->whereNull('pipeline_stage')
                            ->orWhereNotIn('pipeline_stage', ['won', 'lost', 'unqualified']);
                    })
                    ->count(),
                'measurements_pending' => (clone $visitQuery)
                    ->where('status', SiteVisitStatus::SubmittedForReview->value)
                    ->count(),
                'open_tasks_count' => CrmActivity::query()
                    ->where('status', '!=', 'completed')
                    ->when($scope['assignee_id'], fn ($q) => $q->where('assigned_to', $scope['assignee_id']))
                    ->count(),
                'clients_captured_today' => count($clientsCaptured),
                'field_installations_today' => count($fieldInstallations),
                'projects_active' => $projectStats['started'] ?? 0,
                'meetings_today' => $meetingsToday,
                'pipeline_value' => $pipelineValue,
                'field_days_active' => $fieldDay ? 1 : 0,
            ],
            'sections' => [
                'schedule' => $schedule,
                'site_visits' => $siteVisitsToday,
                'field_installations' => $fieldInstallations,
                'clients_captured' => $clientsCaptured,
                'open_tasks' => $openTasks,
                'projects' => $this->projectsForDate($user, $date, $scope),
                'field_day' => $fieldDay,
            ],
            'workload' => $this->assigneeScope->workloadFromEvents(collect($schedule)),
        ];
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return list<array<string, mixed>>
     */
    protected function siteVisitsForDate(User $user, Carbon $date, array $scope): array
    {
        if (! $user->can('site_visits.view') && ! $user->can('site_visits.execute')) {
            return [];
        }

        $query = SiteVisit::query()
            ->with(['assignedFieldOfficer', 'lead', 'account'])
            ->whereDate('visit_date', $date->toDateString())
            ->where('status', '!=', SiteVisitStatus::Cancelled->value)
            ->orderBy('visit_time');

        $this->assigneeScope->applyUserFilter($query, 'assigned_field_officer_id', $scope);

        return $query->get()->map(fn (SiteVisit $visit) => [
            'id' => $visit->id,
            'title' => $visit->title,
            'status' => $visit->status instanceof SiteVisitStatus ? $visit->status->value : $visit->status,
            'visit_time' => $visit->visit_time,
            'site_address' => $visit->site_address,
            'assigned_to' => $visit->assignedFieldOfficer ? [
                'id' => $visit->assignedFieldOfficer->id,
                'name' => $visit->assignedFieldOfficer->name,
            ] : null,
            'lead_name' => $visit->lead?->name,
            'href' => '/crm/site-visits/'.$visit->id,
        ])->all();
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return list<array<string, mixed>>
     */
    protected function fieldInstallationsForDate(User $user, Carbon $date, array $scope): array
    {
        if (! $user->can('field_installation.view') && ! $user->can('field_installation.log')) {
            return [];
        }

        $query = FieldInstallationJob::query()
            ->with(['teamLead', 'project'])
            ->whereNotIn('status', [FieldJobStatus::Completed->value, FieldJobStatus::Cancelled->value])
            ->where(function ($q) use ($date) {
                $q->whereDate('scheduled_start', $date->toDateString())
                    ->orWhereDate('scheduled_end', $date->toDateString());
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

        return $query->get()->map(fn (FieldInstallationJob $job) => [
            'id' => $job->id,
            'reference' => $job->reference,
            'title' => $job->project?->name,
            'status' => $job->status?->value ?? $job->status,
            'site_address' => $job->site_address ?? $job->project?->site_address,
            'assigned_to' => $job->teamLead ? [
                'id' => $job->teamLead->id,
                'name' => $job->teamLead->name,
            ] : null,
            'href' => '/field-installation/jobs/'.$job->id,
        ])->all();
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return list<array<string, mixed>>
     */
    protected function clientsCapturedForDate(User $user, Carbon $date, array $scope): array
    {
        $items = collect();

        if ($user->can('leads.view') || $user->can('crm.view')) {
            $leadQuery = Lead::query()->visibleTo($user)->whereDate('created_at', $date->toDateString());
            if ($scope['assignee_id'] !== null) {
                $leadQuery->where(function ($q) use ($scope) {
                    $q->where('assigned_to', $scope['assignee_id'])
                        ->orWhere('lead_owner_id', $scope['assignee_id'])
                        ->orWhere('assigned_sales_user_id', $scope['assignee_id']);
                });
            }
            $items = $items->concat($leadQuery->limit(20)->get()->map(fn (Lead $lead) => [
                'id' => 'lead-'.$lead->id,
                'type' => 'lead',
                'title' => $lead->name ?? $lead->company_name ?? 'New lead',
                'captured_at' => $lead->created_at?->toIso8601String(),
                'href' => '/crm/leads/'.$lead->id,
            ]));
        }

        if ($user->can('field_day.view')) {
            $pinQuery = FieldDayPin::query()
                ->with(['fieldDay.fieldOfficer', 'lead'])
                ->whereDate('captured_at', $date->toDateString());

            if ($scope['assignee_id'] !== null) {
                $pinQuery->whereHas('fieldDay', fn ($q) => $q->where('field_officer_id', $scope['assignee_id']));
            } elseif ($scope['user_ids'] !== null) {
                $pinQuery->whereHas('fieldDay', fn ($q) => $q->whereIn('field_officer_id', $scope['user_ids']));
            } elseif (! $scope['can_view_all']) {
                $pinQuery->whereHas('fieldDay', fn ($q) => $q->where('field_officer_id', $user->id));
            }

            $items = $items->concat($pinQuery->limit(20)->get()->map(fn (FieldDayPin $pin) => [
                'id' => 'pin-'.$pin->id,
                'type' => 'field_pin',
                'title' => $pin->site_label ?? 'Field capture',
                'captured_at' => $pin->captured_at?->toIso8601String(),
                'href' => $pin->lead_id ? '/crm/leads/'.$pin->lead_id : '/crm/field-day',
            ]));
        }

        return $items->values()->all();
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return array<string, mixed>|null
     */
    protected function fieldDayForDate(User $user, Carbon $date, array $scope): ?array
    {
        if (! $user->can('field_day.view')) {
            return null;
        }

        $query = FieldDay::query()
            ->with(['fieldOfficer', 'pins'])
            ->whereDate('field_date', $date->toDateString());

        if ($scope['assignee_id'] !== null) {
            $query->where('field_officer_id', $scope['assignee_id']);
        } elseif ($scope['user_ids'] !== null) {
            $query->whereIn('field_officer_id', $scope['user_ids']);
        } elseif (! $scope['can_view_all'] && ! $user->can('field_day.manage')) {
            $query->where('field_officer_id', $user->id);
        }

        $fieldDay = $query->first();

        if (! $fieldDay) {
            return null;
        }

        return [
            'id' => $fieldDay->id,
            'field_officer' => $fieldDay->fieldOfficer ? [
                'id' => $fieldDay->fieldOfficer->id,
                'name' => $fieldDay->fieldOfficer->name,
            ] : null,
            'pins_count' => $fieldDay->pins->count(),
            'href' => '/crm/field-day',
        ];
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return list<array<string, mixed>>
     */
    protected function projectsForDate(User $user, Carbon $date, array $scope): array
    {
        if (! $user->can('projects.view')) {
            return [];
        }

        $query = \App\Models\Project::query()
            ->visibleTo($user)
            ->with(['projectManager', 'account'])
            ->where('stage', '!=', \App\Enums\ProjectStage::ProjectComplete->value)
            ->where(function ($q) use ($date) {
                $q->whereDate('projected_end', $date->toDateString())
                    ->orWhereDate('projected_start', $date->toDateString());
            });

        if ($scope['assignee_id'] !== null) {
            $userId = $scope['assignee_id'];
            $query->where(function ($q) use ($userId) {
                $q->where('project_manager_id', $userId)
                    ->orWhere('sales_rep_id', $userId);
            });
        }

        return $query->limit(10)->get()->map(fn ($project) => [
            'id' => $project->id,
            'reference' => $project->reference,
            'name' => $project->name,
            'stage' => $project->stage?->value ?? $project->stage,
            'href' => '/projects/'.$project->id,
        ])->all();
    }
}
