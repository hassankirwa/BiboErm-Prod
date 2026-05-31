<?php

namespace App\Enums\Warehouse;

enum ReferenceType: string
{
    case GoodsReceipt = 'goods_receipt';
    case PurchaseOrder = 'purchase_order';
    case Project = 'project';
    case ProductionOrder = 'production_order';
    case StockTake = 'stock_take';
    case Offcut = 'offcut';
}
