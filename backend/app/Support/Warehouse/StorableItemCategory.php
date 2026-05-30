<?php

namespace App\Support\Warehouse;

use App\Enums\Warehouse\ItemCategory;
use Illuminate\Validation\ValidationException;

final class StorableItemCategory
{
    /** @var list<string> */
    public const FORBIDDEN = [
        'glass',
        'procurement_only',
        'is_procurement_only',
    ];

    public static function assert(string $category): void
    {
        if (in_array(strtolower($category), self::FORBIDDEN, true)) {
            throw ValidationException::withMessages([
                'category' => ['Glass and procurement-only items are not stored in the warehouse. They are sourced per project at procurement.'],
            ]);
        }

        if (ItemCategory::tryFrom($category) === null) {
            throw ValidationException::withMessages([
                'category' => ['Invalid warehouse item category.'],
            ]);
        }
    }
}
