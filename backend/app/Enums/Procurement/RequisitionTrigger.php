<?php

namespace App\Enums\Procurement;

enum RequisitionTrigger: string
{
    case BomShortage = 'bom_shortage';
    case LowStock = 'low_stock';
    case GlassOrder = 'glass_order';
    case ClientAddon = 'client_addon';
    case Manual = 'manual';
}
