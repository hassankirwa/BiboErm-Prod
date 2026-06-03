<?php

namespace App\Policies;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;
use App\Support\ProjectStageAdvance;

class ProjectPolicy
{
    use ChecksCrmPermissions;

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, ['projects.view', 'projects.manage', 'projects.view_all']);
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->can('projects.view_all') || $user->can('projects.manage') || $user->can('projects.material_status.view')) {
            return true;
        }

        if (! $user->can('projects.view')) {
            return false;
        }

        if ((int) $project->project_manager_id === $user->id || (int) $project->sales_rep_id === $user->id) {
            return true;
        }

        return $project->engineerAssignments()
            ->where('user_id', $user->id)
            ->whereNull('removed_at')
            ->exists();
    }

    public function create(User $user): bool
    {
        return $this->canAny($user, ['projects.create', 'projects.manage']);
    }

    public function update(User $user, Project $project): bool
    {
        return $this->view($user, $project)
            && $this->canAny($user, ['projects.update', 'projects.manage']);
    }

    public function assignPm(User $user, Project $project): bool
    {
        return $this->view($user, $project)
            && $this->canAny($user, ['projects.assign_pm', 'projects.manage']);
    }

    public function assignEngineers(User $user, Project $project): bool
    {
        return $this->view($user, $project)
            && $this->canAny($user, ['projects.assign_engineers', 'projects.manage']);
    }

    public function advanceStage(User $user, Project $project): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        if ($this->canAny($user, ['projects.advance_stage', 'projects.manage', 'projects.view_all'])) {
            return true;
        }

        if (
            $this->canAny($user, ['projects.advance_stage_sales'])
            && (int) $project->sales_rep_id === $user->id
        ) {
            return true;
        }

        if ($this->canAny($user, ['projects.advance_stage_warehouse', 'projects.advance_stage_production'])) {
            return true;
        }

        return false;
    }

    public function advanceStageTo(User $user, Project $project, ProjectStage $fromStage, ProjectStage $toStage): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        if ($this->canAny($user, ['projects.manage', 'projects.view_all'])) {
            return true;
        }

        return ProjectStageAdvance::userCanAdvanceTo($user, $fromStage, $toStage);
    }

    public function recordSiteAssessmentNotes(User $user, Project $project): bool
    {
        if (! $this->view($user, $project)) {
            return false;
        }

        return $this->canAny($user, [
            'projects.site_assessment_notes',
            'projects.advance_stage',
            'projects.manage',
            'projects.view_all',
        ]);
    }

    public function logDelay(User $user, Project $project): bool
    {
        return $this->view($user, $project)
            && $this->canAny($user, ['projects.log_delay', 'projects.manage']);
    }

    public function manageFloors(User $user, Project $project): bool
    {
        return $this->view($user, $project)
            && $this->canAny($user, ['projects.floors.manage', 'projects.manage']);
    }

    public function viewMaterialStatus(User $user, Project $project): bool
    {
        return $this->view($user, $project)
            && $this->canAny($user, ['projects.material_status.view', 'projects.manage']);
    }
}
