<?php

namespace App\Enums\Procurement;

enum RequisitionTrigger: string
{
    case BomShortage = 'bom_shortage';
    case ProjectMaterial = 'project_material';
    case LowStock = 'low_stock';
    case GlassOrder = 'glass_order';
    case ClientAddon = 'client_addon';
    case Manual = 'manual';
}
