<?php

namespace App\Enums\Projects;

enum ProjectDispatchStatus: string
{
    case Scheduled = 'scheduled';
    case InTransit = 'in_transit';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
