<?php

namespace App\Policies;

use App\Models\CrmActivity;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;

class CrmActivityPolicy
{
    use ChecksCrmPermissions;

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, ['activities.view', 'crm.view']);
    }

    public function view(User $user, CrmActivity $activity): bool
    {
        if (! $this->viewAny($user)) {
            return false;
        }

        return $this->canViewAll($user, 'activities.view')
            || $this->ownsRecord($user, $activity, ['assigned_to', 'created_by']);
    }

    public function create(User $user): bool
    {
        return $this->canAny($user, ['activities.create', 'crm.manage']);
    }

    public function update(User $user, CrmActivity $activity): bool
    {
        return $this->view($user, $activity);
    }

    public function complete(User $user, CrmActivity $activity): bool
    {
        return $this->canAny($user, ['activities.complete', 'crm.manage'])
            && ($this->canViewAll($user, 'activities.view') || $this->ownsRecord($user, $activity, ['assigned_to']));
    }
}
