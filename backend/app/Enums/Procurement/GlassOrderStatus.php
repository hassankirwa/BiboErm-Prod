<?php

namespace App\Enums\Procurement;

enum GlassOrderStatus: string
{
    case Draft = 'draft';
    case Ordered = 'ordered';
    case InTransit = 'in_transit';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
