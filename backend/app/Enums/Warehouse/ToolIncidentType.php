<?php

namespace App\Enums\Warehouse;

enum ToolIncidentType: string
{
    case Damage = 'damage';
    case Loss = 'loss';
    case Malfunction = 'malfunction';
}
