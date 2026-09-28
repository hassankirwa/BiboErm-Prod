<?php

namespace App\Enums\Warehouse;

enum MaterialRequestStatus: string
{
    case Pending = 'pending';
    case Fulfilled = 'fulfilled';
    case Partial = 'partial';
    case Rejected = 'rejected';
}
