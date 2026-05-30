<?php

namespace App\Enums\Warehouse;

enum DeckSlug: string
{
    case Aluminium = 'aluminium';
    case Offcuts = 'offcuts';
    case Accessories = 'accessories';
    case Rubbers = 'rubbers';

    public function managerRole(): string
    {
        return match ($this) {
            self::Aluminium, self::Offcuts => 'warehouse_manager_aluminium',
            self::Accessories, self::Rubbers => 'warehouse_manager_accessories',
        };
    }
}
