<?php

namespace App\Enums\Warehouse;

enum MaterialRequestSource: string
{
    case Warehouse = 'warehouse';
    case Production = 'production';
}
