<?php

namespace App\Policies\Warehouse;

use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Support\Warehouse\DeckAccess;

class StockMovementPolicy
{
    public function create(User $user): bool
    {
        return $user->can('warehouse.stock.receive')
            || $user->can('warehouse.stock.issue')
            || $user->can('warehouse.stock.transfer')
            || $user->can('warehouse.stock.adjust');
    }

    public function performOnBin(User $user, Bin $bin): bool
    {
        return DeckAccess::canManageBin($user, $bin);
    }
}
