<?php

namespace App\Enums\Procurement;

enum DriverStatus: string
{
    case Available = 'available';
    case Occupied = 'occupied';
    case Inactive = 'inactive';
}
