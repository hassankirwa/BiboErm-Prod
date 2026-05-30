<?php

namespace App\Policies\Procurement;

use App\Models\Procurement\PurchaseRequisition;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class PurchaseRequisitionPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'purchase_requisition';

    public function approve(User $user, PurchaseRequisition $requisition): bool
    {
        return $this->canApprove($user) || $user->can('procurement.manage');
    }
}
