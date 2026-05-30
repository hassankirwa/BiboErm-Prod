<?php

namespace App\Enums\Warehouse;

enum ToolCondition: string
{
    case Good = 'good';
    case Fair = 'fair';
    case Damaged = 'damaged';
    case Retired = 'retired';
}
