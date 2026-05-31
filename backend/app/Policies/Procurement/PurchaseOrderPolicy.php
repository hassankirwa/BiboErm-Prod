<?php

namespace App\Policies\Procurement;

use App\Models\Procurement\PurchaseOrder;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class PurchaseOrderPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'purchase_order';

    public function approve(User $user, PurchaseOrder $order): bool
    {
        return $this->canApprove($user) || $user->can('procurement.manage');
    }
}
