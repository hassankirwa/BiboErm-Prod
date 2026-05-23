<?php

namespace App\Services\Roles;

use App\Models\User;
use Spatie\Permission\Models\Role;

class SyncDepartmentRolesToSpatie
{
    /**
     * Replace Spatie roles with the distinct roles assigned via user_department_roles.
     */
    public function sync(User $user): void
    {
        $roleIds = $user->departmentRoles()->pluck('role_id')->unique()->filter()->values();

        if ($roleIds->isEmpty()) {
            $user->syncRoles([]);

            return;
        }

        $names = Role::query()->whereIn('id', $roleIds)->pluck('name')->all();
        $user->syncRoles($names);
    }
}
