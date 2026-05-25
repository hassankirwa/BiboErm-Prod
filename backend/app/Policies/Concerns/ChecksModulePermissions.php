<?php

namespace App\Policies\Concerns;

use App\Models\User;

trait ChecksModulePermissions
{
    protected function moduleKey(): string
    {
        if (property_exists($this, 'module')) {
            return $this->module;
        }

        throw new \LogicException('Policy must define $module or override moduleKey().');
    }

    protected function canView(User $user): bool
    {
        $permission = config("permissions.policies.{$this->moduleKey()}.view");

        return ($permission && $user->can($permission))
            || $user->can('crm.view');
    }

    protected function canManage(User $user): bool
    {
        $permission = config("permissions.policies.{$this->moduleKey()}.manage");

        return ($permission && $user->can($permission))
            || $user->can('crm.manage');
    }

    protected function canCreate(User $user): bool
    {
        $permission = config("permissions.policies.{$this->moduleKey()}.create");

        return ($permission && $user->can($permission))
            || $this->canManage($user);
    }

    protected function canApprove(User $user): bool
    {
        $permission = config("permissions.policies.{$this->moduleKey()}.approve");

        return $permission && $user->can($permission);
    }

    public function viewAny(User $user): bool
    {
        return $this->canView($user);
    }

    public function view(User $user, mixed $model = null): bool
    {
        return $this->canView($user);
    }

    public function create(User $user): bool
    {
        return $this->canCreate($user);
    }

    public function update(User $user, mixed $model = null): bool
    {
        return $this->canManage($user);
    }

    public function delete(User $user, mixed $model = null): bool
    {
        return $this->canManage($user);
    }
}
