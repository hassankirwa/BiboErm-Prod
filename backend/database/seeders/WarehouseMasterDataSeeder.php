<?php

namespace Database\Seeders;

use App\Enums\Warehouse\ItemCategory;
use App\Models\Warehouse\Accessory;
use App\Models\Warehouse\AluminiumProfile;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\DoorTypeAccessory;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\Rubber;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockLevel;
use App\Models\Warehouse\Tool;
use Illuminate\Database\Seeder;

class WarehouseMasterDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAluminiumProfiles();
        $this->seedAccessories();
        $this->seedRubbers();
        $this->seedTools();
    }

    private function seedAluminiumProfiles(): void
    {
        $profiles = [
            [
                'sku' => 'PROF-SLD-80MM',
                'name' => '80mm Sliding Frame Profile',
                'profile_family' => 'Sliding Frame',
                'finish' => 'Black Matt',
                'standard_bar_length_mm' => 6000,
                'min_stock_qty' => 100,
                'seed_qty' => 240,
            ],
            [
                'sku' => 'PROF-CSM-70MM',
                'name' => '70mm Casement Frame Profile',
                'profile_family' => 'Casement Frame',
                'finish' => 'White Gloss',
                'standard_bar_length_mm' => 6000,
                'min_stock_qty' => 80,
                'seed_qty' => 180,
            ],
        ];

        foreach ($profiles as $data) {
            $item = Item::query()->updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'name' => $data['name'],
                    'category' => ItemCategory::AluminiumProfile,
                    'unit_of_measure' => 'metre',
                    'min_stock_qty' => $data['min_stock_qty'],
                    'is_active' => true,
                ]
            );

            AluminiumProfile::query()->updateOrCreate(
                ['item_id' => $item->id],
                [
                    'profile_family' => $data['profile_family'],
                    'width_mm' => 80,
                    'finish' => $data['finish'],
                    'weight_per_metre' => 1.25,
                    'standard_bar_length_mm' => $data['standard_bar_length_mm'],
                ]
            );

            $sectionCode = str_contains($data['sku'], 'SLD') ? 'SEC-ALU-SLD-FRAME' : 'SEC-ALU-CSM-FRAME';
            $binId = Bin::query()
                ->whereHas('section', fn ($q) => $q->where('code', $sectionCode))
                ->where('code', 'CAGE1')
                ->value('id');

            if ($binId) {
                StockLevel::query()->updateOrCreate(
                    ['item_id' => $item->id, 'bin_id' => $binId],
                    [
                        'quantity_on_hand' => $data['seed_qty'],
                        'quantity_reserved' => 0,
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    private function seedAccessories(): void
    {
        $sldDoor = DoorType::query()->where('code', 'SLD')->first();
        $binHinges = Bin::query()
            ->whereHas('section', fn ($q) => $q->where('code', 'SEC-SLD'))
            ->where('code', 'BIN2')
            ->first();

        $accessories = [
            [
                'sku' => 'ACC-HNG-001',
                'name' => 'Heavy Duty Hinge 100mm',
                'door_type_id' => $sldDoor?->id,
                'default_bin_id' => $binHinges?->id,
                'standard_qty' => 4,
                'seed_qty' => 240,
            ],
            [
                'sku' => 'ACC-HDL-001',
                'name' => 'Sliding Door Handle Set',
                'door_type_id' => $sldDoor?->id,
                'default_bin_id' => Bin::query()
                    ->whereHas('section', fn ($q) => $q->where('code', 'SEC-SLD'))
                    ->where('code', 'BIN1')
                    ->value('id'),
                'standard_qty' => 2,
                'seed_qty' => 120,
            ],
        ];

        foreach ($accessories as $data) {
            if (! $data['door_type_id']) {
                continue;
            }

            $item = Item::query()->updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'name' => $data['name'],
                    'category' => ItemCategory::Accessory,
                    'unit_of_measure' => 'each',
                    'door_type_id' => $data['door_type_id'],
                    'min_stock_qty' => 50,
                    'is_active' => true,
                ]
            );

            Accessory::query()->updateOrCreate(
                ['item_id' => $item->id],
                [
                    'door_type_id' => $data['door_type_id'],
                    'default_bin_id' => $data['default_bin_id'],
                ]
            );

            DoorTypeAccessory::query()->updateOrCreate(
                ['door_type_id' => $data['door_type_id'], 'item_id' => $item->id],
                ['standard_qty' => $data['standard_qty']]
            );

            if ($data['default_bin_id']) {
                StockLevel::query()->updateOrCreate(
                    ['item_id' => $item->id, 'bin_id' => $data['default_bin_id']],
                    [
                        'quantity_on_hand' => $data['seed_qty'],
                        'quantity_reserved' => 0,
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    private function seedRubbers(): void
    {
        $profileId = Item::query()->where('sku', 'PROF-SLD-80MM')->value('id');
        $sectionId = Section::query()->where('code', 'SEC-RUB-SLD')->value('id');
        $binId = Bin::query()
            ->whereHas('section', fn ($q) => $q->where('code', 'SEC-RUB-SLD'))
            ->where('code', 'BIN1')
            ->value('id');

        if (! $profileId || ! $binId) {
            return;
        }

        $item = Item::query()->updateOrCreate(
            ['sku' => 'RUB-SLD-80'],
            [
                'name' => 'Sliding 80mm Frame Gasket',
                'category' => ItemCategory::Rubber,
                'unit_of_measure' => 'metre',
                'min_stock_qty' => 200,
                'is_active' => true,
            ]
        );

        Rubber::query()->updateOrCreate(
            ['item_id' => $item->id],
            [
                'compatible_profile_ids' => [$profileId],
                'default_section_id' => $sectionId,
            ]
        );

        StockLevel::query()->updateOrCreate(
            ['item_id' => $item->id, 'bin_id' => $binId],
            [
                'quantity_on_hand' => 500,
                'quantity_reserved' => 0,
                'updated_at' => now(),
            ]
        );
    }

    private function seedTools(): void
    {
        $tools = [
            [
                'tool_code' => 'TL-CUT-001',
                'name' => 'Double Mitre Saw',
                'tool_type' => 'cutting',
                'is_returnable' => true,
            ],
            [
                'tool_code' => 'TL-DRLL-001',
                'name' => 'Cordless Drill Set',
                'tool_type' => 'power_tool',
                'is_returnable' => true,
            ],
            [
                'tool_code' => 'TL-NAIL-001',
                'name' => 'Assorted Nails Box',
                'tool_type' => 'fastener',
                'is_returnable' => false,
                'tracking_mode' => 'quantity',
                'total_qty' => 500,
            ],
        ];

        foreach ($tools as $tool) {
            Tool::query()->updateOrCreate(
                ['tool_code' => $tool['tool_code']],
                [
                    'name' => $tool['name'],
                    'tool_type' => $tool['tool_type'],
                    'is_returnable' => $tool['is_returnable'],
                    'tracking_mode' => $tool['tracking_mode'] ?? 'serialized',
                    'total_qty' => $tool['total_qty'] ?? 1,
                    'qty_in_repair' => 0,
                    'condition' => 'good',
                    'is_active' => true,
                ]
            );
        }
    }
}
