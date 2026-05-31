<?php

namespace App\Enums\Warehouse;

enum ReservationStatus: string
{
    case Pending = 'pending';
    case Partial = 'partial';
    case Fulfilled = 'fulfilled';
    case Released = 'released';
    case Cancelled = 'cancelled';
}
