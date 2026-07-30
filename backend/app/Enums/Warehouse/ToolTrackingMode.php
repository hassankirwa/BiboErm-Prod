<?php

namespace App\Enums\Warehouse;

enum ToolTrackingMode: string
{
    case Serialized = 'serialized';
    case Quantity = 'quantity';

    public function isSerialized(): bool
    {
        return $this === self::Serialized;
    }

    public function isQuantity(): bool
    {
        return $this === self::Quantity;
    }
}
