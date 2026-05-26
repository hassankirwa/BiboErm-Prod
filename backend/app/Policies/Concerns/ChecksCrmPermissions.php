<?php

namespace App\Policies\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

trait ChecksCrmPermissions
{
    protected function hasLegacyCrmAccess(User $user): bool
    {
        return $user->can('crm.view') || $user->can('crm.manage');
    }

    protected function canAny(User $user, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }

    protected function canViewAll(User $user, string $viewAllPermission): bool
    {
        return $user->can($viewAllPermission);
    }

    protected function ownsRecord(User $user, Model $model, array $ownerColumns): bool
    {
        foreach ($ownerColumns as $column) {
            if ((int) $model->getAttribute($column) === $user->id) {
                return true;
            }
        }

        return false;
    }
}
