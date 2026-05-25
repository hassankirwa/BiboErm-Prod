<?php

namespace App\Policies;

use App\Models\SiteVisit;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;

class SiteVisitPolicy
{
    use ChecksCrmPermissions;

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, ['site_visits.view', 'site_visits.view_all', 'crm.view']);
    }

    public function view(User $user, SiteVisit $siteVisit): bool
    {
        if (! $this->viewAny($user)) {
            return false;
        }

        if ($this->canViewAll($user, 'site_visits.view_all')) {
            return true;
        }

        return $this->ownsRecord($user, $siteVisit, ['assigned_field_officer_id', 'scheduled_by']);
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
        return $user->can('site_visits.execute')
            && (int) $siteVisit->assigned_field_officer_id === $user->id;
    }

    public function approve(User $user, SiteVisit $siteVisit): bool
    {
        return $user->can('site_visits.approve') || $this->hasLegacyCrmAccess($user);
    }
}
