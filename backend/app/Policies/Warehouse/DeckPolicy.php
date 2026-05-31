<?php

namespace App\Policies\Warehouse;

use App\Models\User;
use App\Models\Warehouse\Deck;
use App\Support\Warehouse\DeckAccess;

class DeckPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('warehouse.locations.view')
            || $user->can('warehouse.stock.view')
            || $user->can('warehouse.stock.view_all');
    }

    public function manage(User $user, Deck $deck): bool
    {
        if ($user->can('warehouse.locations.manage') && DeckAccess::canManageDeck($user, DeckAccess::deckSlug($deck))) {
            return true;
        }

        return false;
    }
}
