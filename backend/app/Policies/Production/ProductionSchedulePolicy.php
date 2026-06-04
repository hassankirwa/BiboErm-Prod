<?php

namespace App\Policies\Production;

use App\Models\User;

class ProductionSchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('production.view')
            || $user->can('production.manage')
            || $user->can('production.schedule.manage');
    }
}
