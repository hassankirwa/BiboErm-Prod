<?php

namespace App\Policies\Procurement;

use App\Models\Procurement\GoodsReceipt;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class GoodsReceiptPolicy
{
    use ChecksModulePermissions {
        canView as protected canViewModule;
    }

    protected string $module = 'goods_receipt';

    protected function canView(User $user): bool
    {
        return $this->canViewModule($user) || $user->can('procurement.grn.view');
    }

    public function update(User $user, GoodsReceipt $grn): bool
    {
        return $this->canManage($user)
            || $user->can('procurement.grn.verify')
            || $user->can('warehouse.stock.receive');
    }

    public function verify(User $user, GoodsReceipt $grn): bool
    {
        return $this->canManage($user) || $user->can('procurement.grn.verify');
    }
}
