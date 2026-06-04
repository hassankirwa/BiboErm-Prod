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
use Illuminate\Database\Seeder;

/**
 * Seeds ten warehouse catalogue lines below minimum stock for procurement low-stock requisitions.
 */
class LowStockDemoSeeder extends Seeder
{
    public function run(): void
    {
        $sldDoor = DoorType::query()->where('code', 'SLD')->first();
        $csmDoor = DoorType::query()->where('code', 'CSM')->first();
        $profileIds = [];

        foreach ($this->profileDefinitions() as $data) {
            $profileIds[] = $this->seedProfile($data);
        }

        foreach ($this->accessoryDefinitions($sldDoor, $csmDoor) as $data) {
            $this->seedAccessory($data);
        }

        foreach ($this->rubberDefinitions($profileIds) as $data) {
            $this->seedRubber($data);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function profileDefinitions(): array
    {
        return [
            [
                'sku' => 'PROF-DEMO-LS-01',
                'name' => '80mm Sliding Sash Profile (demo low stock)',
                'section_code' => 'SEC-ALU-SLD-FRAME',
                'bin_code' => 'CAGE2',
                'profile_family' => 'Sliding Sash',
                'min_stock_qty' => 50,
                'quantity_on_hand' => 8,
            ],
            [
                'sku' => 'PROF-DEMO-LS-02',
                'name' => '80mm Sliding Interlock Profile (demo low stock)',
                'section_code' => 'SEC-ALU-SLD-FRAME',
                'bin_code' => 'CAGE3',
                'profile_family' => 'Sliding Interlock',
                'min_stock_qty' => 40,
                'quantity_on_hand' => 5,
            ],
            [
                'sku' => 'PROF-DEMO-LS-03',
                'name' => '70mm Casement Mullion Profile (demo low stock)',
                'section_code' => 'SEC-ALU-CSM-FRAME',
                'bin_code' => 'CAGE1',
                'profile_family' => 'Casement Mullion',
                'min_stock_qty' => 60,
                'quantity_on_hand' => 12,
            ],
            [
                'sku' => 'PROF-DEMO-LS-04',
                'name' => '70mm Casement Bead Profile (demo low stock)',
                'section_code' => 'SEC-ALU-CSM-FRAME',
                'bin_code' => 'CAGE2',
                'profile_family' => 'Casement Bead',
                'min_stock_qty' => 30,
                'quantity_on_hand' => 3,
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function accessoryDefinitions(?DoorType $sldDoor, ?DoorType $csmDoor): array
    {
        return [
            [
                'sku' => 'ACC-DEMO-LS-01',
                'name' => 'Sliding Roller Wheel Set (demo low stock)',
                'door_type' => $sldDoor,
                'section_code' => 'SEC-SLD',
                'bin_code' => 'CAGE3',
                'standard_qty' => 4,
                'min_stock_qty' => 100,
                'quantity_on_hand' => 15,
            ],
            [
                'sku' => 'ACC-DEMO-LS-02',
                'name' => 'Sliding Lock Cylinder (demo low stock)',
                'door_type' => $sldDoor,
                'section_code' => 'SEC-SLD',
                'bin_code' => 'BIN4',
                'standard_qty' => 1,
                'min_stock_qty' => 40,
                'quantity_on_hand' => 6,
            ],
            [
                'sku' => 'ACC-DEMO-LS-03',
                'name' => 'Casement Friction Stay Pair (demo low stock)',
                'door_type' => $csmDoor,
                'section_code' => 'SEC-CSM',
                'bin_code' => 'BIN1',
                'standard_qty' => 2,
                'min_stock_qty' => 25,
                'quantity_on_hand' => 4,
            ],
        ];
    }

    /**
     * @param  list<int>  $profileIds
     * @return list<array<string, mixed>>
     */
    private function rubberDefinitions(array $profileIds): array
    {
        $compatible = array_values(array_filter($profileIds));

        return [
            [
                'sku' => 'RUB-DEMO-LS-01',
                'name' => 'Sliding sash gasket roll (demo low stock)',
                'section_code' => 'SEC-RUB-SLD',
                'min_stock_qty' => 150,
                'quantity_on_hand' => 20,
                'compatible_profile_ids' => array_slice($compatible, 0, 2),
            ],
            [
                'sku' => 'RUB-DEMO-LS-02',
                'name' => 'Casement frame seal strip (demo low stock)',
                'section_code' => 'SEC-RUB-CSM',
                'min_stock_qty' => 120,
                'quantity_on_hand' => 10,
                'compatible_profile_ids' => array_slice($compatible, 2, 2) ?: $compatible,
            ],
            [
                'sku' => 'RUB-DEMO-LS-03',
                'name' => 'Universal glazing wedge gasket (demo low stock)',
                'section_code' => 'SEC-RUB-SLD',
                'min_stock_qty' => 80,
                'quantity_on_hand' => 8,
                'compatible_profile_ids' => $compatible,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function seedProfile(array $data): int
    {
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
                'finish' => 'Mill Finish',
                'weight_per_metre' => 1.1,
                'standard_bar_length_mm' => 6000,
            ]
        );

        $this->setStockLevel($item->id, $data['section_code'], $data['bin_code'], $data['quantity_on_hand']);

        return $item->id;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function seedAccessory(array $data): void
    {
        if (! $data['door_type']) {
            return;
        }

        $binId = $this->resolveBinId($data['section_code'], $data['bin_code']);

        $item = Item::query()->updateOrCreate(
            ['sku' => $data['sku']],
            [
                'name' => $data['name'],
                'category' => ItemCategory::Accessory,
                'unit_of_measure' => 'each',
                'door_type_id' => $data['door_type']->id,
                'min_stock_qty' => $data['min_stock_qty'],
                'is_active' => true,
            ]
        );

        Accessory::query()->updateOrCreate(
            ['item_id' => $item->id],
            [
                'door_type_id' => $data['door_type']->id,
                'default_bin_id' => $binId,
            ]
        );

        DoorTypeAccessory::query()->updateOrCreate(
            [
                'door_type_id' => $data['door_type']->id,
                'item_id' => $item->id,
            ],
            ['standard_qty' => $data['standard_qty']]
        );

        if ($binId) {
            $this->setStockLevel($item->id, $data['section_code'], $data['bin_code'], $data['quantity_on_hand']);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function seedRubber(array $data): void
    {
        $sectionId = Section::query()->where('code', $data['section_code'])->value('id');

        $item = Item::query()->updateOrCreate(
            ['sku' => $data['sku']],
            [
                'name' => $data['name'],
                'category' => ItemCategory::Rubber,
                'unit_of_measure' => 'metre',
                'min_stock_qty' => $data['min_stock_qty'],
                'is_active' => true,
            ]
        );

        Rubber::query()->updateOrCreate(
            ['item_id' => $item->id],
            [
                'compatible_profile_ids' => $data['compatible_profile_ids'],
                'default_section_id' => $sectionId,
            ]
        );

        $this->setStockLevel($item->id, $data['section_code'], 'BIN1', $data['quantity_on_hand']);
    }

    private function setStockLevel(int $itemId, string $sectionCode, string $binCode, float $quantityOnHand): void
    {
        $binId = $this->resolveBinId($sectionCode, $binCode);

        if (! $binId) {
            return;
        }

        StockLevel::query()->updateOrCreate(
            ['item_id' => $itemId, 'bin_id' => $binId],
            [
                'quantity_on_hand' => $quantityOnHand,
                'quantity_reserved' => 0,
                'updated_at' => now(),
            ]
        );
    }

    private function resolveBinId(string $sectionCode, string $binCode): ?int
    {
        return Bin::query()
            ->where('code', $binCode)
            ->whereHas('section', fn ($q) => $q->where('code', $sectionCode))
            ->value('id');
    }
}
