<?php

namespace App\Policies\FieldInstallation;

use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class FieldInstallationJobPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'field_installation_job';

    public function log(User $user, ?FieldInstallationJob $job = null): bool
    {
        return $user->can('field_installation.log') || $this->canManage($user);
    }

    public function deliver(User $user, ?FieldInstallationJob $job = null): bool
    {
        return $user->can('field_installation.deliver') || $this->canManage($user);
    }

    public function tools(User $user, ?FieldInstallationJob $job = null): bool
    {
        return $user->can('field_installation.tools') || $this->canManage($user);
    }

    public function start(User $user, FieldInstallationJob $job): bool
    {
        return $this->canManage($user);
    }

    public function complete(User $user, FieldInstallationJob $job): bool
    {
        return $this->canManage($user);
    }

    public function hold(User $user, FieldInstallationJob $job): bool
    {
        return $this->canManage($user);
    }

    public function cancel(User $user, FieldInstallationJob $job): bool
    {
        return $this->canManage($user);
    }
}
