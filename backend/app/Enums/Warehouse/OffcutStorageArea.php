<?php

namespace App\Enums\Warehouse;

enum OffcutStorageArea: string
{
    case WarehouseDeck = 'warehouse_deck';
    case ProductionWorkspace = 'production_workspace';
}
