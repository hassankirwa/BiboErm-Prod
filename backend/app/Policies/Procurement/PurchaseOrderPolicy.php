<?php

namespace App\Policies\Procurement;

use App\Models\Procurement\PurchaseOrder;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class PurchaseOrderPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'purchase_order';

    public function viewAny(User $user): bool
    {
        return $user->can('procurement.po.view')
            || $user->can('procurement.view')
            || $this->canView($user);
    }

    public function view(User $user, mixed $model = null): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->can('procurement.po.create')
            || $user->can('procurement.manage')
            || $this->canCreate($user);
    }

    public function update(User $user, mixed $model = null): bool
    {
        return $user->can('procurement.po.update')
            || $user->can('procurement.manage')
            || $this->canManage($user);
    }

    public function approve(User $user, PurchaseOrder $order): bool
    {
        return $user->can('procurement.po.approve')
            || $this->canApprove($user)
            || $user->can('procurement.manage');
    }
}
