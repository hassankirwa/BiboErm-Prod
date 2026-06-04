<?php

namespace Database\Seeders;

use App\Enums\Warehouse\DeckSlug;
use App\Enums\Warehouse\SectionType;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\Warehouse;
use Illuminate\Database\Seeder;

class WarehouseStructureSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedDoorTypes();

        $warehouse = Warehouse::query()->updateOrCreate(
            ['code' => 'WH-MAIN'],
            [
                'name' => 'BIBO Main Warehouse',
                'address' => 'Nairobi, Kenya',
                'is_active' => true,
            ]
        );

        $decks = [
            ['slug' => DeckSlug::Aluminium, 'name' => 'Aluminium Profiles', 'sort_order' => 1],
            ['slug' => DeckSlug::Offcuts, 'name' => 'Offcuts', 'sort_order' => 2],
            ['slug' => DeckSlug::Accessories, 'name' => 'Accessories', 'sort_order' => 3],
            ['slug' => DeckSlug::Rubbers, 'name' => 'Rubbers & Gaskets', 'sort_order' => 4],
        ];

        foreach ($decks as $deckData) {
            Deck::query()->updateOrCreate(
                ['warehouse_id' => $warehouse->id, 'slug' => $deckData['slug']],
                ['name' => $deckData['name'], 'sort_order' => $deckData['sort_order']]
            );
        }

        $this->seedAccessorySections($warehouse);
        $this->seedAluminiumSections($warehouse);
        $this->seedOffcutSections($warehouse);
        $this->seedRubberSections($warehouse);
    }

    private function seedDoorTypes(): void
    {
        $doorTypes = [
            ['code' => 'SLD', 'name' => 'Sliding Door', 'section_code' => 'SEC-SLD'],
            ['code' => 'FLD', 'name' => 'Folding Door', 'section_code' => 'SEC-FLD'],
            ['code' => 'CSM', 'name' => 'Casement Window', 'section_code' => 'SEC-CSM'],
            ['code' => 'BTH', 'name' => 'Bathroom', 'section_code' => 'SEC-BTH'],
            ['code' => 'AWN', 'name' => 'Awning Window', 'section_code' => 'SEC-AWN'],
            ['code' => 'GEN', 'name' => 'General', 'section_code' => 'SEC-GEN'],
        ];

        foreach ($doorTypes as $doorType) {
            \App\Models\Warehouse\DoorType::query()->updateOrCreate(
                ['code' => $doorType['code']],
                [
                    'name' => $doorType['name'],
                    'section_code' => $doorType['section_code'],
                    'is_active' => true,
                ]
            );
        }
    }

    private function seedAccessorySections(Warehouse $warehouse): void
    {
        $deck = Deck::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('slug', DeckSlug::Accessories)
            ->first();

        if (! $deck) {
            return;
        }

        $sections = [
            ['code' => 'SEC-SLD', 'name' => 'Sliding Door Accessories', 'door_code' => 'SLD', 'type' => SectionType::DoorAccessories],
            ['code' => 'SEC-FLD', 'name' => 'Folding Door Accessories', 'door_code' => 'FLD', 'type' => SectionType::DoorAccessories],
            ['code' => 'SEC-CSM', 'name' => 'Casement Window Accessories', 'door_code' => 'CSM', 'type' => SectionType::DoorAccessories],
            ['code' => 'SEC-BTH', 'name' => 'Bathroom Accessories', 'door_code' => 'BTH', 'type' => SectionType::BathroomAccessories],
            ['code' => 'SEC-AWN', 'name' => 'Awning Accessories', 'door_code' => 'AWN', 'type' => SectionType::DoorAccessories],
            ['code' => 'SEC-GEN', 'name' => 'General Accessories', 'door_code' => 'GEN', 'type' => SectionType::GeneralAccessories],
        ];

        $binLabels = [
            'BIN1' => 'Handles',
            'BIN2' => 'Hinges',
            'BIN3' => 'Rollers',
            'BIN4' => 'Locks',
            'BIN5' => 'Tracks / Misc',
        ];

        foreach ($sections as $index => $sectionData) {
            $doorTypeId = \App\Models\Warehouse\DoorType::query()
                ->where('code', $sectionData['door_code'])
                ->value('id');

            $section = Section::query()->updateOrCreate(
                ['deck_id' => $deck->id, 'code' => $sectionData['code']],
                [
                    'door_type_id' => $doorTypeId,
                    'name' => $sectionData['name'],
                    'section_type' => $sectionData['type'],
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );

            foreach ($binLabels as $code => $label) {
                Bin::query()->updateOrCreate(
                    ['section_id' => $section->id, 'code' => $code],
                    [
                        'name' => $label,
                        'sort_order' => (int) str_replace('BIN', '', $code),
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    private function seedAluminiumSections(Warehouse $warehouse): void
    {
        $deck = Deck::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('slug', DeckSlug::Aluminium)
            ->first();

        if (! $deck) {
            return;
        }

        $sections = [
            ['code' => 'SEC-ALU-SLD-FRAME', 'name' => 'Sliding Frame Profiles'],
            ['code' => 'SEC-ALU-CSM-FRAME', 'name' => 'Casement Frame Profiles'],
        ];

        foreach ($sections as $index => $sectionData) {
            $section = Section::query()->updateOrCreate(
                ['deck_id' => $deck->id, 'code' => $sectionData['code']],
                [
                    'name' => $sectionData['name'],
                    'section_type' => SectionType::ProfileFamily,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );

            $this->migrateLegacyAluminiumBinCodes($section);

            $cages = [
                'CAGE1' => 'Cage 1',
                'CAGE2' => 'Cage 2',
                'CAGE3' => 'Cage 3',
            ];

            $sort = 1;
            foreach ($cages as $code => $name) {
                Bin::query()->updateOrCreate(
                    ['section_id' => $section->id, 'code' => $code],
                    [
                        'name' => $name,
                        'sort_order' => $sort++,
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    /**
     * Rename legacy BIN* codes on aluminium profile sections (keeps stock_levels FKs intact).
     */
    private function migrateLegacyAluminiumBinCodes(Section $section): void
    {
        $map = [
            'BIN1' => ['code' => 'CAGE1', 'name' => 'Cage 1'],
            'BIN2' => ['code' => 'CAGE2', 'name' => 'Cage 2'],
            'BIN3' => ['code' => 'CAGE3', 'name' => 'Cage 3'],
        ];

        foreach ($map as $legacyCode => $target) {
            $legacy = Bin::query()
                ->where('section_id', $section->id)
                ->where('code', $legacyCode)
                ->first();

            if (! $legacy) {
                continue;
            }

            $targetExists = Bin::query()
                ->where('section_id', $section->id)
                ->where('code', $target['code'])
                ->whereKeyNot($legacy->id)
                ->exists();

            if ($targetExists) {
                continue;
            }

            $legacy->update([
                'code' => $target['code'],
                'name' => $target['name'],
            ]);
        }
    }

    private function seedOffcutSections(Warehouse $warehouse): void
    {
        $deck = Deck::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('slug', DeckSlug::Offcuts)
            ->first();

        if (! $deck) {
            return;
        }

        $sections = [
            ['code' => 'SEC-OFF-SLD80', 'name' => 'Offcuts — 80mm Sliding Profile'],
            ['code' => 'SEC-OFF-CSM70', 'name' => 'Offcuts — 70mm Casement Profile'],
        ];

        foreach ($sections as $index => $sectionData) {
            $section = Section::query()->updateOrCreate(
                ['deck_id' => $deck->id, 'code' => $sectionData['code']],
                [
                    'name' => $sectionData['name'],
                    'section_type' => SectionType::OffcutProfile,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );

            Bin::query()->updateOrCreate(
                ['section_id' => $section->id, 'code' => 'BIN1'],
                ['name' => 'General', 'sort_order' => 1, 'is_active' => true]
            );
        }
    }

    private function seedRubberSections(Warehouse $warehouse): void
    {
        $deck = Deck::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('slug', DeckSlug::Rubbers)
            ->first();

        if (! $deck) {
            return;
        }

        $sections = [
            ['code' => 'SEC-RUB-SLD', 'name' => 'Gaskets for Sliding Profiles'],
            ['code' => 'SEC-RUB-CSM', 'name' => 'Gaskets for Casement Profiles'],
        ];

        foreach ($sections as $index => $sectionData) {
            $section = Section::query()->updateOrCreate(
                ['deck_id' => $deck->id, 'code' => $sectionData['code']],
                [
                    'name' => $sectionData['name'],
                    'section_type' => SectionType::RubberProfile,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                ]
            );

            Bin::query()->updateOrCreate(
                ['section_id' => $section->id, 'code' => 'BIN1'],
                ['name' => 'Roll Storage', 'sort_order' => 1, 'is_active' => true]
            );
        }
    }
}
