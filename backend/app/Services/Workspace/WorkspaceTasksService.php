<?php

namespace App\Services\Workspace;

use App\Enums\Crm\SiteVisitStatus;
use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\ProjectStage;
use App\Models\CrmActivity;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Lead;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Models\User;
use App\Support\Crm\CrmActivityTypeGroups;
use App\Support\Crm\SiteVisitSchedule;
use App\Support\Workspace\WorkspaceAssigneeScope;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WorkspaceTasksService
{
    public function __construct(
        protected WorkspaceAssigneeScope $assigneeScope,
    ) {}

    /**
     * @return array{data: Collection<int, array<string, mixed>>, total: int}
     */
    public function tasksForUser(
        User $user,
        ?int $assignedTo = null,
        ?string $type = null,
        ?string $status = null,
        ?string $dueBefore = null,
        ?string $role = null,
        ?int $departmentId = null,
    ): array {
        $scope = $this->assigneeScope->resolve($user, $assignedTo, $role, $departmentId);
        $tasks = collect();

        if ($type === null || in_array($type, ['task', 'meeting', 'call', 'follow_up', 'activity'], true)) {
            if ($user->can('activities.view') || $user->can('crm.view')) {
                $tasks = $tasks->concat($this->activityTasks($scope, $type, $status, $dueBefore));
            }
        }

        if ($type === null || $type === 'site_visit') {
            if ($user->can('site_visits.view') || $user->can('site_visits.execute')) {
                $tasks = $tasks->concat($this->siteVisitTasks($scope, $status));
            }
        }

        if ($type === null || $type === 'project') {
            if ($user->can('projects.view')) {
                $tasks = $tasks->concat($this->projectTasks($user, $scope));
            }
        }

        if ($type === null || $type === 'field_installation') {
            if ($user->can('field_installation.view') || $user->can('field_installation.log')) {
                $tasks = $tasks->concat($this->fieldInstallationTasks($user, $scope));
            }
        }

        $sorted = $tasks
            ->sortBy(fn (array $task) => $task['due_at'] ?? '9999-12-31')
            ->values();

        return [
            'data' => $sorted,
            'total' => $sorted->count(),
        ];
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function activityTasks(
        array $scope,
        ?string $type,
        ?string $status,
        ?string $dueBefore,
    ): Collection {
        $query = CrmActivity::query()
            ->with(['assignee', 'lead', 'account', 'deal'])
            ->where('status', '!=', 'completed');

        if ($status === 'overdue') {
            $query->where('status', 'overdue');
        } elseif ($status === 'open') {
            $query->whereIn('status', ['pending', 'overdue', 'scheduled', 'in_progress']);
        }

        if ($type && $type !== 'activity') {
            $types = CrmActivityTypeGroups::resolveFilterTypes($type);
            $query->where(function ($q) use ($types) {
                $q->whereIn('activity_type', $types)->orWhereIn('type', $types);
            });
        }

        if ($dueBefore) {
            $query->where(function ($q) use ($dueBefore) {
                $q->whereDate('due_at', '<=', $dueBefore)
                    ->orWhereDate('scheduled_start_at', '<=', $dueBefore);
            });
        }

        $this->assigneeScope->applyUserFilter($query, 'assigned_to', $scope);

        return $query->latest()->limit(100)->get()->map(function (CrmActivity $activity) {
            $activityType = $activity->activity_type ?? $activity->type ?? 'task';
            $dueAt = $activity->scheduled_start_at ?? $activity->due_at;

            return [
                'id' => 'activity-'.$activity->id,
                'source' => 'crm_activity',
                'type' => $this->normalizeActivityType($activityType),
                'title' => $activity->subject,
                'due_at' => $dueAt?->toIso8601String(),
                'assigned_to' => $activity->assignee ? [
                    'id' => $activity->assignee->id,
                    'name' => $activity->assignee->name,
                ] : null,
                'status' => $activity->status,
                'priority' => $activity->priority ?? 'normal',
                'href' => $activity->lead_id
                    ? '/crm/leads/'.$activity->lead_id
                    : ($activity->account_id ? '/crm/accounts/'.$activity->account_id : '/workspace/tasks'),
                'meta' => [
                    'lead_name' => $activity->lead?->name,
                    'location' => $activity->location,
                    'activity_type' => $activityType,
                ],
            ];
        });
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function siteVisitTasks(array $scope, ?string $status): Collection
    {
        $openStatuses = [
            SiteVisitStatus::Scheduled->value,
            SiteVisitStatus::Assigned->value,
            SiteVisitStatus::InProgress->value,
            SiteVisitStatus::MeasurementsCaptured->value,
        ];

        $query = SiteVisit::query()
            ->with(['assignedFieldOfficer', 'lead', 'account'])
            ->whereIn('status', $openStatuses)
            ->orderBy('visit_date')
            ->orderBy('visit_time');

        $this->assigneeScope->applyUserFilter($query, 'assigned_field_officer_id', $scope);

        return $query->limit(50)->get()->map(function (SiteVisit $visit) {
            $dueAt = SiteVisitSchedule::startsAt($visit);

            return [
                'id' => 'site-visit-'.$visit->id,
                'source' => 'site_visit',
                'type' => 'site_visit',
                'title' => $visit->title,
                'due_at' => $dueAt->toIso8601String(),
                'assigned_to' => $visit->assignedFieldOfficer ? [
                    'id' => $visit->assignedFieldOfficer->id,
                    'name' => $visit->assignedFieldOfficer->name,
                ] : null,
                'status' => $visit->status instanceof SiteVisitStatus ? $visit->status->value : $visit->status,
                'priority' => 'normal',
                'href' => '/crm/site-visits/'.$visit->id,
                'meta' => [
                    'lead_name' => $visit->lead?->name,
                    'location' => $visit->site_address,
                ],
            ];
        });
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function projectTasks(User $user, array $scope): Collection
    {
        $query = Project::query()
            ->visibleTo($user)
            ->with(['projectManager', 'account'])
            ->where('stage', '!=', ProjectStage::ProjectComplete->value);

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
        } elseif (! $scope['can_view_all']) {
            $query->where(function ($q) use ($user) {
                $q->where('project_manager_id', $user->id)
                    ->orWhere('sales_rep_id', $user->id)
                    ->orWhereHas('engineerAssignments', fn ($e) => $e->where('user_id', $user->id)->whereNull('removed_at'));
            });
        }

        return $query->limit(30)->get()->map(function (Project $project) {
            $dueAt = $project->projected_end ?? $project->projected_start;

            return [
                'id' => 'project-'.$project->id,
                'source' => 'project',
                'type' => 'project',
                'title' => $project->reference.' — '.$project->name,
                'due_at' => $dueAt?->toIso8601String(),
                'assigned_to' => $project->projectManager ? [
                    'id' => $project->projectManager->id,
                    'name' => $project->projectManager->name,
                ] : null,
                'status' => $project->stage?->value ?? $project->stage,
                'priority' => $project->priority ?? 'normal',
                'href' => '/projects/'.$project->id,
                'meta' => [
                    'account_name' => $project->account?->name,
                    'location' => $project->site_address,
                ],
            ];
        });
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     * @return Collection<int, array<string, mixed>>
     */
    protected function fieldInstallationTasks(User $user, array $scope): Collection
    {
        $query = FieldInstallationJob::query()
            ->with(['teamLead', 'project'])
            ->whereIn('status', [
                FieldJobStatus::Scheduled->value,
                FieldJobStatus::InProgress->value,
                FieldJobStatus::OnHold->value,
            ]);

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

        return $query->limit(30)->get()->map(function (FieldInstallationJob $job) {
            return [
                'id' => 'field-job-'.$job->id,
                'source' => 'field_installation',
                'type' => 'field_installation',
                'title' => $job->reference.' — '.$job->project?->name,
                'due_at' => $job->scheduled_start?->toIso8601String(),
                'assigned_to' => $job->teamLead ? [
                    'id' => $job->teamLead->id,
                    'name' => $job->teamLead->name,
                ] : null,
                'status' => $job->status?->value ?? $job->status,
                'priority' => 'normal',
                'href' => '/field-installation/jobs/'.$job->id,
                'meta' => [
                    'location' => $job->site_address ?? $job->project?->site_address,
                ],
            ];
        });
    }

    protected function normalizeActivityType(string $activityType): string
    {
        $meetingTypes = CrmActivityTypeGroups::resolveFilterTypes('meeting');
        $callTypes = CrmActivityTypeGroups::resolveFilterTypes('call');
        $taskTypes = CrmActivityTypeGroups::resolveFilterTypes('task');

        if (in_array($activityType, $meetingTypes, true)) {
            return 'meeting';
        }
        if (in_array($activityType, $callTypes, true)) {
            return 'call';
        }
        if (in_array($activityType, $taskTypes, true)) {
            return 'task';
        }

        return 'task';
    }
}
