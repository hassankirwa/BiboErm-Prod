<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;
use App\Policies\Concerns\ChecksCrmPermissions;
use App\Policies\Concerns\ChecksModulePermissions;

class DealPolicy
{
    use ChecksCrmPermissions, ChecksModulePermissions;

    protected string $module = 'deal';

    public function view(User $user, Deal $deal): bool
    {
        if ($this->canViewAll($user, 'deals.view_all')) {
            return true;
        }

        if (! $this->canAny($user, ['deals.view', 'crm.view'])) {
            return false;
        }

        return $this->ownsRecord($user, $deal, [
            'deal_owner_id',
            'owner_id',
            'created_by',
        ]);
    }

    public function update(User $user, Deal $deal): bool
    {
        return $this->view($user, $deal)
            && $this->canAny($user, ['deals.update', 'crm.manage']);
    }

    public function markWon(User $user, Deal $deal): bool
    {
        return $this->view($user, $deal)
            && $this->canAny($user, ['deals.mark_won', 'crm.manage']);
    }

    public function markLost(User $user, Deal $deal): bool
    {
        return $this->view($user, $deal)
            && $this->canAny($user, ['deals.mark_lost', 'crm.manage']);
    }

    public function createProject(User $user, Deal $deal): bool
    {
        return $this->view($user, $deal)
            && $this->canAny($user, ['deals.create_project', 'crm.manage']);
    }
}
