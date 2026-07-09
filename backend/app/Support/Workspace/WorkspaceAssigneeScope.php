<?php

namespace App\Support\Workspace;

use App\Models\User;
use App\Models\UserDepartmentRole;
use Illuminate\Support\Collection;

class WorkspaceAssigneeScope
{
    /**
     * @return array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}
     */
    public function resolve(
        User $user,
        ?int $assignedTo = null,
        ?string $role = null,
        ?int $departmentId = null,
    ): array {
        $canViewAll = $user->can('activities.view_all')
            || $user->can('site_visits.view_all')
            || $user->can('projects.view_all');

        $userIds = $this->resolveUserIds($role, $departmentId);

        if ($assignedTo !== null) {
            return [
                'can_view_all' => $canViewAll,
                'assignee_id' => $assignedTo,
                'user_ids' => $userIds,
            ];
        }

        if ($userIds !== null && count($userIds) > 0) {
            return [
                'can_view_all' => true,
                'assignee_id' => null,
                'user_ids' => $userIds,
            ];
        }

        return [
            'can_view_all' => $canViewAll,
            'assignee_id' => $canViewAll ? null : $user->id,
            'user_ids' => null,
        ];
    }

    /**
     * @return array<int>|null
     */
    protected function resolveUserIds(?string $role, ?int $departmentId): ?array
    {
        if ($role === null && $departmentId === null) {
            return null;
        }

        $query = UserDepartmentRole::query()->select('user_id');

        if ($role !== null) {
            $query->whereHas('role', fn ($q) => $q->where('name', $role));
        }

        if ($departmentId !== null) {
            $query->where('department_id', $departmentId);
        }

        $ids = $query->distinct()->pluck('user_id')->map(fn ($id) => (int) $id)->all();

        return count($ids) > 0 ? $ids : [-1];
    }

    /**
     * @param  array{can_view_all: bool, assignee_id: int|null, user_ids: array<int>|null}  $scope
     */
    public function applyUserFilter($query, string $column, array $scope): void
    {
        if ($scope['assignee_id'] !== null) {
            $query->where($column, $scope['assignee_id']);

            return;
        }

        if ($scope['user_ids'] !== null) {
            $query->whereIn($column, $scope['user_ids']);

            return;
        }

        if (! $scope['can_view_all']) {
            $query->whereRaw('1 = 0');
        }
    }

    /**
     * @return Collection<int, array{user_id: int, name: string, count: int}>
     */
    public function workloadFromEvents(Collection $events): Collection
    {
        return $events
            ->filter(fn (array $event) => ! empty($event['assigned_to']['id']))
            ->groupBy(fn (array $event) => $event['assigned_to']['id'])
            ->map(function (Collection $group, $userId) {
                $first = $group->first();

                return [
                    'user_id' => (int) $userId,
                    'name' => $first['assigned_to']['name'] ?? 'Unknown',
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('count')
            ->values();
    }
}
