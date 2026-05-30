<?php

namespace App\Enums\Warehouse;

enum StockMovementType: string
{
    case Inbound = 'inbound';
    case Outbound = 'outbound';
    case Transfer = 'transfer';
    case Adjustment = 'adjustment';
}
