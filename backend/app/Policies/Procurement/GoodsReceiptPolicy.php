<?php

namespace App\Policies\Procurement;

use App\Models\Procurement\GoodsReceipt;
use App\Models\User;
use App\Policies\Concerns\ChecksModulePermissions;

class GoodsReceiptPolicy
{
    use ChecksModulePermissions;

    protected string $module = 'goods_receipt';

    public function verify(User $user, GoodsReceipt $grn): bool
    {
        return $this->canManage($user) || $user->can('procurement.grn.verify');
    }
}
