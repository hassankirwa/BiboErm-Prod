<?php

namespace Tests\Unit\Projects;

use App\Models\Warehouse\Item;
use App\Services\Projects\WincadBomLineBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WincadBomLineBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_wincad_fabrication_payload_becomes_resolved_bom_lines(): void
    {
        $profile = Item::query()->create([
            'sku' => 'PY08',
            'name' => 'Side frame',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'metre',
            'is_active' => true,
        ]);

        $accessory = Item::query()->create([
            'sku' => 'ACC-ROLLER-90',
            'name' => 'Roller 90 SD',
            'category' => 'accessory',
            'unit_of_measure' => 'each',
            'is_active' => true,
        ]);

        $payload = app(WincadBomLineBuilder::class)->build([
            'project' => ['name' => 'BEATRICE'],
            'items' => [[
                'code' => 'SD-1',
                'series' => 'S90 Sliding',
                'quantity' => 2,
                'frame_profiles' => [[
                    'code_no' => 'PY08',
                    'name' => 'Side frame',
                    'length_mm' => 1816,
                    'qty' => 2,
                ]],
                'sash_profiles' => [],
                'hardware' => [[
                    'name' => 'Roller 90 SD',
                    'qty' => 4,
                    'unit' => 'pcs',
                ]],
                'glass' => [[
                    'name' => 'Reflective glass',
                    'width_mm' => 1687,
                    'height_mm' => 1961,
                    'qty' => 1,
                    'specification' => '6mm brown',
                ]],
            ]],
        ], 'BEATRICE FABRICATION LIST.xls');

        $profileLine = collect($payload['lines'])->firstWhere('material_code', 'PY08');
        $hardwareLine = collect($payload['lines'])->firstWhere('material_name', 'Roller 90 SD');
        $glassLine = collect($payload['lines'])->firstWhere('line_type', 'glass');

        $this->assertSame('wincad_fabrication', $payload['source_type']);
        $this->assertSame($profile->id, $profileLine['warehouse_item_id']);
        $this->assertSame(4.0, $profileLine['quantity']);
        $this->assertSame(1816, $profileLine['measurement_mm']);
        $this->assertSame('metre', $profileLine['unit_of_measure']);
        $this->assertSame('wincad', $profileLine['source_system']);
        $this->assertSame('S90 Sliding', $profileLine['series']);
        $this->assertSame('SD-1', $profileLine['opening_code']);
        $this->assertSame($accessory->id, $hardwareLine['warehouse_item_id']);
        $this->assertSame(8.0, $hardwareLine['quantity']);
        $this->assertSame('pcs', $hardwareLine['unit_of_measure']);
        $this->assertSame('procurement_only', $glassLine['resolution_status']);
        $this->assertSame(1687, $glassLine['width_mm']);
        $this->assertSame(1961, $glassLine['height_mm']);
        $this->assertNull($glassLine['warehouse_item_id']);
    }
}
