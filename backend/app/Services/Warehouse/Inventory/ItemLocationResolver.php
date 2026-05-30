<?php

namespace App\Services\Warehouse\Inventory;

use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Item;

class ItemLocationResolver
{
    public function pathForBin(Bin $bin): array
    {
        $bin->loadMissing('section.deck.warehouse');

        $warehouse = $bin->section?->deck?->warehouse;
        $deck = $bin->section?->deck;
        $section = $bin->section;

        return [
            'warehouse' => $warehouse ? [
                'id' => $warehouse->id,
                'code' => $warehouse->code,
                'name' => $warehouse->name,
            ] : null,
            'deck' => $deck ? [
                'id' => $deck->id,
                'slug' => $deck->slug?->value ?? $deck->slug,
                'name' => $deck->name,
            ] : null,
            'section' => $section ? [
                'id' => $section->id,
                'code' => $section->code,
                'name' => $section->name,
            ] : null,
            'bin' => [
                'id' => $bin->id,
                'code' => $bin->code,
                'name' => $bin->name,
            ],
            'path_label' => collect([
                $warehouse?->name,
                $deck?->name,
                $section?->name,
                $bin->name ? "{$bin->code} ({$bin->name})" : $bin->code,
            ])->filter()->implode(' → '),
        ];
    }

    public function pathForItemAtBin(Item $item, Bin $bin): array
    {
        return array_merge(
            ['item' => ['id' => $item->id, 'sku' => $item->sku, 'name' => $item->name]],
            $this->pathForBin($bin)
        );
    }
}
