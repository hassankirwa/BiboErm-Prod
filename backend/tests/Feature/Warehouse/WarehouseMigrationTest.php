<?php

namespace Tests\Feature\Warehouse;

use Illuminate\Support\Facades\Schema;

class WarehouseMigrationTest extends WarehouseFeatureTestCase
{
    /**
     * Tables defined in WAREHOUSE_MIGRATION_SPEC.MD §3–§4.
     *
     * @var list<string>
     */
    private const EXPECTED_TABLES = [
        'warehouses',
        'warehouse_decks',
        'door_types',
        'warehouse_sections',
        'warehouse_bins',
        'warehouse_items',
        'aluminium_profiles',
        'accessories',
        'rubbers',
        'door_type_accessories',
        'stock_levels',
        'stock_movements',
        'stock_movement_lines',
        'stock_reservations',
        'stock_reservation_lines',
        'offcut_pieces',
        'warehouse_tools',
        'tool_issuances',
    ];

    public function test_all_eighteen_warehouse_tables_exist(): void
    {
        foreach (self::EXPECTED_TABLES as $table) {
            $this->assertTrue(
                Schema::hasTable($table),
                "Expected warehouse table [{$table}] to exist."
            );
        }
    }

    public function test_seeded_structure_matches_plan(): void
    {
        $warehouse = $this->mainWarehouse();

        $this->assertSame('WH-MAIN', $warehouse->code);
        $this->assertSame(4, $warehouse->decks()->count());

        $expectedDeckSlugs = ['aluminium', 'offcuts', 'accessories', 'rubbers'];

        $this->assertSame(
            $expectedDeckSlugs,
            $warehouse->decks()->orderBy('sort_order')->pluck('slug')->map(fn ($slug) => $slug->value ?? $slug)->all()
        );

        $this->assertGreaterThan(0, $this->sectionByCode('SEC-SLD')->bins()->count());
        $this->assertGreaterThan(0, $this->sectionByCode('SEC-OFF-SLD80')->bins()->count());
        $this->assertGreaterThan(0, $this->sectionByCode('SEC-RUB-SLD')->bins()->count());
    }

    public function test_seeded_master_data_contains_sample_skus(): void
    {
        $this->assertNotNull($this->itemBySku('PROF-SLD-80MM'));
        $this->assertNotNull($this->itemBySku('ACC-HNG-001'));
        $this->assertNotNull($this->itemBySku('RUB-SLD-80'));
        $this->assertNotNull($this->toolByCode('TL-CUT-001'));
    }
}
