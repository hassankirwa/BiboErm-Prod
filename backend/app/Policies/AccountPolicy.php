<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;
use App\Policies\Concerns\ChecksModulePermissions;

class AccountPolicy
{
    use ChecksCrmPermissions, ChecksModulePermissions;

    protected string $module = 'account';

    public function view(User $user, Account $account): bool
    {
        if ($this->canViewAll($user, 'accounts.view_all')) {
            return true;
        }

        if (! $this->canAny($user, ['accounts.view', 'crm.view'])) {
            return false;
        }

        return $this->ownsRecord($user, $account, [
            'account_owner_id',
            'owner_id',
            'created_by',
        ]);
    }

    public function update(User $user, Account $account): bool
    {
        return $this->view($user, $account)
            && $this->canAny($user, ['accounts.update', 'crm.manage']);
    }
}
