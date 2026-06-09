<?php

namespace App\Listeners\Projects;

use App\Events\Crm\DealProjectCreated;
use App\Models\Department;
use App\Models\Project;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Services\Projects\ProjectDealSyncService;
use App\Services\Projects\ProjectStageService;

class OnDealProjectCreated
{
    public function __construct(
        protected ProjectStageService $stages,
        protected ProjectDealSyncService $dealSync,
    ) {}

    public function handle(DealProjectCreated $event): void
    {
        /** @var Project $project */
        $project = $event->project->fresh();

        $this->stages->initialize($project);

        if (config('bibo.pm.auto_assign_round_robin', false) && ! $project->project_manager_id) {
            $pmId = $this->nextProjectManagerId();

            if ($pmId !== null) {
                $project->forceFill(['project_manager_id' => $pmId])->save();
            }
        }

        $this->dealSync->syncFromDeal($project);
    }

    protected function nextProjectManagerId(): ?int
    {
        $departmentId = Department::query()
            ->where('slug', 'project_management')
            ->value('id');

        if (! $departmentId) {
            return null;
        }

        return UserDepartmentRole::query()
            ->where('department_id', $departmentId)
            ->whereHas('role', fn ($query) => $query->where('name', 'project_manager'))
            ->join('users', 'users.id', '=', 'user_department_roles.user_id')
            ->where('users.status', User::STATUS_ACTIVE)
            ->orderBy('user_department_roles.assigned_at')
            ->value('user_department_roles.user_id');
    }

}
