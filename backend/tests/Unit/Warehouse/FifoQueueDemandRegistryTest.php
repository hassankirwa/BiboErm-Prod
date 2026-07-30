<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Item;
use App\Services\Warehouse\Reservations\FifoQueueDemandRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class FifoQueueDemandRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_sums_accessory_demand_and_uses_aluminium_bar_metres(): void
    {
        Cache::flush();

        $profile = Item::query()->create([
            'sku' => 'PY08-FIFO',
            'name' => 'Side frame',
            'category' => ItemCategory::AluminiumProfile->value,
            'unit_of_measure' => 'metre',
            'is_active' => true,
        ]);

        $accessory = Item::query()->create([
            'sku' => 'ACC-FIFO',
            'name' => 'Handle',
            'category' => ItemCategory::Accessory->value,
            'unit_of_measure' => 'pcs',
            'is_active' => true,
        ]);

        $registry = app(FifoQueueDemandRegistry::class);
        $registry->record(99, [
            [
                'item_id' => $profile->id,
                'quantity' => 2,
                'required_length_mm' => 2090,
            ],
            [
                'item_id' => $profile->id,
                'quantity' => 2,
                'required_length_mm' => 1816,
            ],
            [
                'item_id' => $accessory->id,
                'quantity' => 3,
            ],
            [
                'item_id' => $accessory->id,
                'quantity' => 2,
            ],
        ]);

        // 2×2090 + 2×1816 packs onto 2 bars → 12 metres.
        $this->assertSame('12.000', $registry->demandForItem(99, $profile->id));
        $this->assertSame('5.000', $registry->demandForItem(99, $accessory->id));
    }
}
