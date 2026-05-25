<?php

namespace App\Policies;

use App\Models\FieldDay;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;

class FieldDayPolicy
{
    use ChecksCrmPermissions;

    public function viewAny(User $user): bool
    {
        return $this->canAny($user, ['field_day.view', 'crm.view']);
    }

    public function view(User $user, FieldDay $fieldDay): bool
    {
        if (! $this->viewAny($user)) {
            return false;
        }

        return $user->can('field_day.manage')
            || $this->ownsRecord($user, $fieldDay, ['field_officer_id', 'created_by']);
    }

    public function create(User $user): bool
    {
        return $this->canAny($user, ['field_day.create', 'crm.manage']);
    }
}
