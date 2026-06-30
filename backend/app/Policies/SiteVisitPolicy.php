<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\Lead;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;
use App\Support\Crm\SiteVisitAssigneeRoles;

class SiteVisitPolicy
{
    use ChecksCrmPermissions;

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, [
            'site_visits.view',
            'site_visits.view_all',
            'site_visits.execute',
            'field_installation.view',
            'field_installation.log',
            'crm.view',
        ]);
    }

    public function view(User $user, SiteVisit $siteVisit): bool
    {
        if (! $this->viewAny($user)) {
            return false;
        }

        if ($this->canViewAll($user, 'site_visits.view_all')) {
            return true;
        }

        if ($this->ownsRecord($user, $siteVisit, ['assigned_field_officer_id', 'scheduled_by'])) {
            return true;
        }

        if ($siteVisit->lead_id && Lead::query()->visibleTo($user)->whereKey($siteVisit->lead_id)->exists()) {
            return true;
        }

        if ($siteVisit->deal_id && Deal::query()->visibleTo($user)->whereKey($siteVisit->deal_id)->exists()) {
            return true;
        }

        if ($siteVisit->project_id && Project::query()->visibleTo($user)->whereKey($siteVisit->project_id)->exists()) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $this->canAny($user, ['site_visits.schedule', 'crm.manage']);
    }

    public function update(User $user, SiteVisit $siteVisit): bool
    {
        return $this->view($user, $siteVisit);
    }

    public function execute(User $user, SiteVisit $siteVisit): bool
    {
        if ((int) $siteVisit->assigned_field_officer_id !== $user->id) {
            return false;
        }

        return $user->can('site_visits.execute')
            || $user->can('field_installation.log')
            || ($user->can('site_visits.view') && SiteVisitAssigneeRoles::userIsEligible($user));
    }

    public function approve(User $user, SiteVisit $siteVisit): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        if ((int) $siteVisit->scheduled_by === $user->id) {
            return true;
        }

        if ($siteVisit->lead_id) {
            $leadOwnerId = $siteVisit->relationLoaded('lead')
                ? $siteVisit->lead?->lead_owner_id
                : Lead::query()->whereKey($siteVisit->lead_id)->value('lead_owner_id');

            if ((int) $leadOwnerId === $user->id) {
                return true;
            }
        }

        return false;
    }
}
