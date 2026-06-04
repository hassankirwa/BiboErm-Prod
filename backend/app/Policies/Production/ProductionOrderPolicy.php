<?php

namespace App\Policies\Production;

use App\Enums\Production\TeamRole;
use App\Models\Production\ProductionOrder;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class ProductionOrderPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'production_order';

    public function view(User $user, ProductionOrder $order): bool
    {
        if (! $this->canView($user)) {
            return false;
        }

        if ($this->hasScheduleAccess($user)) {
            return true;
        }

        return $order->teams()->where('user_id', $user->id)->exists();
    }

    public function manageStages(User $user, ProductionOrder $order): bool
    {
        if (! $user->can('production.manage')) {
            return false;
        }

        if ($this->hasScheduleAccess($user)) {
            return true;
        }

        return $order->teams()
            ->where('user_id', $user->id)
            ->where('stage', $order->current_stage->value)
            ->exists();
    }

    public function updateSchedule(User $user, ProductionOrder $order): bool
    {
        return $user->can('production.schedule.manage') || $this->canManage($user);
    }

    public function assignTeam(User $user, ProductionOrder $order): bool
    {
        return $this->updateSchedule($user, $order);
    }

    protected function hasScheduleAccess(User $user): bool
    {
        return $user->can('production.schedule.manage') || $this->canManage($user);
    }
}
