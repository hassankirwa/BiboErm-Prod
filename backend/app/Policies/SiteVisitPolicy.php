<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\Lead;
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

        if ($this->ownsRecord($user, $siteVisit, ['assigned_field_officer_id', 'scheduled_by'])) {
            return true;
        }

        if ($siteVisit->lead_id && Lead::query()->visibleTo($user)->whereKey($siteVisit->lead_id)->exists()) {
            return true;
        }

        if ($siteVisit->deal_id && Deal::query()->visibleTo($user)->whereKey($siteVisit->deal_id)->exists()) {
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
        return $user->can('site_visits.execute')
            && (int) $siteVisit->assigned_field_officer_id === $user->id;
    }

    public function approve(User $user, SiteVisit $siteVisit): bool
    {
        return $user->can('site_visits.approve') || $this->hasLegacyCrmAccess($user);
    }
}
