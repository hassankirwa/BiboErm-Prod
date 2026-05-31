<?php

namespace App\Policies\Warehouse;

use App\Models\User;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\OffcutPiece;
use App\Support\Warehouse\DeckAccess;

class OffcutPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('warehouse.offcuts.manage')
            || $user->can('warehouse.offcuts.log')
            || $user->can('warehouse.offcuts.allocate');
    }

    public function log(User $user, Bin $bin): bool
    {
        return $user->can('warehouse.offcuts.log')
            && DeckAccess::canManageBin($user, $bin);
    }

    public function allocate(User $user, OffcutPiece $offcut): bool
    {
        $offcut->loadMissing('bin.section.deck');

        return $user->can('warehouse.offcuts.allocate')
            && DeckAccess::canManageBin($user, $offcut->bin);
    }
}
