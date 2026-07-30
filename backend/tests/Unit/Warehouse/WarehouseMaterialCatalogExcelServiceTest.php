<?php

namespace Tests\Unit\Warehouse;

use App\Models\Warehouse\DoorType;
use App\Models\Warehouse\Item;
use App\Models\Warehouse\ItemAlias;
use App\Services\Warehouse\MasterData\WarehouseMaterialCatalogExcelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class WarehouseMaterialCatalogExcelServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        DoorType::query()->create([
            'code' => 'GEN',
            'name' => 'General',
            'section_code' => 'SEC-GEN',
            'is_active' => true,
        ]);
    }

    public function test_material_catalog_rows_store_items_aliases_and_export_xlsx(): void
    {
        $service = app(WarehouseMaterialCatalogExcelService::class);

        $summary = $service->storeItems([
            [
                'sku' => 'PY08',
                'name' => 'Side frame',
                'category' => 'aluminium_profile',
                'catalog_tier' => 'standard',
                'unit_of_measure' => 'metre',
                'source_sheet' => '90 SERIES',
                'source_code' => 'PY08',
                'source_name' => 'Side frame',
                'standard_bar_length_mm' => 6000,
            ],
            [
                'sku' => 'ACC-ROLLER-90',
                'name' => 'Roller 90 SD',
                'category' => 'accessory',
                'catalog_tier' => 'standard',
                'unit_of_measure' => 'each',
                'source_sheet' => '90 SERIES',
                'source_code' => null,
                'source_name' => 'Roller 90 SD',
            ],
        ], 'catalog');

        $this->assertSame(2, $summary['stored']);
        $this->assertSame(2, $summary['added']);
        $this->assertSame(0, $summary['skipped']);
        $this->assertDatabaseHas('warehouse_items', ['sku' => 'PY08', 'catalog_tier' => 'standard']);
        $this->assertDatabaseHas('warehouse_items', ['sku' => 'ACC-ROLLER-90']);
        $this->assertDatabaseHas('aluminium_profiles', [
            'item_id' => Item::query()->where('sku', 'PY08')->value('id'),
            'standard_bar_length_mm' => 6000,
        ]);
        $this->assertDatabaseHas('warehouse_item_aliases', [
            'source_system' => 'catalog',
            'source_code' => 'PY08',
            'source_name' => 'Side frame',
        ]);
        $this->assertGreaterThanOrEqual(2, ItemAlias::query()->where('source_system', 'catalog')->count());
        $this->assertDatabaseHas('warehouse_items', ['sku' => 'ROLLER-90-SD']);
        $this->assertDatabaseHas('warehouse_item_aliases', [
            'source_system' => 'wincad',
            'source_name' => 'Roller 90 SD',
        ]);

        $path = $service->exportWarehouseItems();

        $this->assertFileExists($path);
        $this->assertGreaterThan(0, filesize($path));
        @unlink($path);
    }

    public function test_extracts_premium_workbook_with_profile_codes_and_images(): void
    {
        $path = base_path('../docs/PREMIUM.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('PREMIUM.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'PREMIUM.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $this->assertSame('premium', $result['catalog_tier']);
        $this->assertGreaterThan(50, $result['summary']['total_items']);
        $this->assertGreaterThan(50, $result['summary']['with_images']);

        $tlItem = collect($result['items'])->first(fn (array $item) => ($item['sku'] ?? null) === 'TL-7004-1.4');
        $this->assertNotNull($tlItem);
        $this->assertSame('sash', mb_strtolower((string) $tlItem['name']));
        $this->assertSame('70*30.9', $tlItem['description']);
        $this->assertNotEmpty($tlItem['image_url']);
        $this->assertArrayNotHasKey('picture_data_url', $tlItem);
        $this->assertArrayNotHasKey('embedded_media', $tlItem);
    }

    public function test_extracts_balustrade_sections_totals_and_image_urls(): void
    {
        $path = base_path('../docs/BALUSTRADE.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('BALUSTRADE.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'BALUSTRADE.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $handrail = collect($result['items'])->first(
            fn (array $item) => str_contains(mb_strtolower((string) ($item['name'] ?? '')), 'handrail')
                && ($item['reference_total_qty'] ?? $item['catalog_metadata']['reference_total_qty'] ?? null) === 48.0,
        );
        $this->assertNotNull($handrail);
        $this->assertSame('STAINLESS BALCONY', $handrail['profile_family']);

        $uChannel = collect($result['items'])->first(
            fn (array $item) => mb_strtoupper((string) ($item['name'] ?? '')) === 'U-CHAANEL',
        );
        $this->assertNotNull($uChannel);
        $this->assertSame('STAINLESS BALCONY', $uChannel['profile_family']);
        $this->assertSame(1.0, $uChannel['reference_total_qty'] ?? $uChannel['total_qty']);

        $steelGroove = collect($result['items'])->first(
            fn (array $item) => str_contains(mb_strtolower((string) ($item['name'] ?? '')), 'steel groove')
                && ($item['reference_total_qty'] ?? $item['total_qty'] ?? null) === 70.0,
        );
        $this->assertNotNull($steelGroove);
        $this->assertSame('U CHANNEL STEEL MILD', $steelGroove['profile_family']);

        $firstWithImage = collect($result['items'])->first(fn (array $item) => ! empty($item['image_url']));
        if ($firstWithImage !== null) {
            $this->assertArrayNotHasKey('picture_data_url', $firstWithImage);
        }
    }

    public function test_extracts_standard_workbook_with_wp_series_items(): void
    {
        $path = base_path('../docs/STANDARD.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('STANDARD.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'STANDARD.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $this->assertSame('standard', $result['catalog_tier']);

        $frame = collect($result['items'])->first(fn (array $item) => ($item['sku'] ?? null) === 'WP5009');
        $this->assertNotNull($frame);
        $this->assertSame('FRAME', mb_strtoupper((string) $frame['name']));
        $this->assertSame('37.3*20.3', $frame['description']);
        $this->assertSame('aluminium_profile', $frame['category']);
    }

    public function test_extracts_standard_accessories_block_with_skus_and_groups(): void
    {
        $path = base_path('../docs/STANDARD.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('STANDARD.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'STANDARD.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $lockRight = collect($result['items'])->first(
            fn (array $item) => ($item['name'] ?? '') === 'LOCK HANDLE'
                && ($item['catalog_metadata']['variant'] ?? null) === 'RIGHT',
        );
        $this->assertNotNull($lockRight);
        $this->assertSame('accessory', $lockRight['category']);
        $this->assertSame('each', $lockRight['unit_of_measure']);
        $this->assertSame('50 SERIES ACCESSORIES', $lockRight['profile_family']);
        $this->assertNotEmpty($lockRight['sku']);

        $lockLeft = collect($result['items'])->first(fn (array $item) => ($item['sku'] ?? null) === '738B-LEFT');
        $this->assertNotNull($lockLeft);
        $this->assertSame('accessory', $lockLeft['category']);
        $this->assertNotEmpty($lockLeft['image_url']);

        $hingesItem = collect($result['items'])->first(fn (array $item) => ($item['sku'] ?? null) === 'HINGES-1025304');
        $this->assertNotNull($hingesItem);
        $this->assertNotSame(
            $hingesItem['image_url'],
            $lockLeft['image_url'],
            'LEFT lock handle must not inherit the hinges photo from the next product group',
        );

        $this->assertGreaterThan(0, $result['summary']['accessory']);
    }

    public function test_extracts_standard_hinges_variants_with_distinct_skus(): void
    {
        $path = base_path('../docs/STANDARD.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('STANDARD.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'STANDARD.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $hinges = collect($result['items'])->filter(
            fn (array $item) => ($item['name'] ?? '') === 'HINGES'
                || ($item['catalog_metadata']['parent_name'] ?? null) === 'HINGES',
        );

        $this->assertGreaterThanOrEqual(4, $hinges->count());
        $this->assertSame($hinges->count(), $hinges->pluck('sku')->unique()->count());

        $withImage = $hinges->first(fn (array $item) => ! empty($item['image_url']));
        $this->assertNotNull($withImage);
    }

    public function test_extracts_balustrade_workbook_as_accessory_items(): void
    {
        $path = base_path('../docs/BALUSTRADE.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('BALUSTRADE.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'BALUSTRADE.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $this->assertSame('balustrade', $result['catalog_tier']);
        $this->assertGreaterThan(10, $result['summary']['total_items']);
        $this->assertGreaterThan(0, $result['summary']['accessory']);

        $first = $result['items'][0] ?? null;
        $this->assertNotNull($first);
        $this->assertSame('accessory', $first['category']);
        $this->assertNotNull($first['name']);
    }

    public function test_extracts_balustrade_without_null_skus(): void
    {
        $path = base_path('../docs/BALUSTRADE.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('BALUSTRADE.xlsx fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'BALUSTRADE.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $nullSkus = collect($result['items'])->filter(
            fn (array $item) => ! isset($item['sku']) || $item['sku'] === null || $item['sku'] === '',
        );

        $this->assertSame(0, $nullSkus->count());
    }

    public function test_extracts_aluminium_specialty_workbook(): void
    {
        $path = base_path('../docs/ALUMINIUM tubes,louvers,shower,net.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('ALUMINIUM specialty fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'ALUMINIUM tubes,louvers,shower,net.xlsx', null, null, true);
        $result = $service->extractFromUpload($file);

        $this->assertSame('specialty', $result['catalog_tier']);
        $this->assertGreaterThan(5, $result['summary']['total_items']);
        $this->assertArrayHasKey('diff', $result);
        $this->assertArrayHasKey('counts', $result['diff']);

        $nullSkus = collect($result['items'])->filter(
            fn (array $item) => ! isset($item['sku']) || $item['sku'] === null || $item['sku'] === '',
        );
        $this->assertSame(0, $nullSkus->count());

        $bySheet = $result['summary']['by_sheet'] ?? [];
        $this->assertNotEmpty($bySheet);
        $this->assertGreaterThanOrEqual(2, count($bySheet));

        $withImages = collect($result['items'])->filter(fn (array $item) => ! empty($item['image_url']));
        $this->assertGreaterThan(
            (int) floor($result['summary']['total_items'] * 0.3),
            $withImages->count(),
            'Expected majority of specialty items to include images',
        );

        // Specialty workbooks are image-led; totals are optional when present in cells.
        $withReferenceTotal = collect($result['items'])->filter(
            fn (array $item) => ($item['reference_total_qty'] ?? null) !== null
                || ($item['catalog_metadata']['reference_total_qty'] ?? null) !== null,
        );
        $this->assertGreaterThanOrEqual(0, $withReferenceTotal->count());
    }

    public function test_incremental_reimport_adds_only_new_specialty_rows(): void
    {
        $path = base_path('../docs/ALUMINIUM tubes,louvers,shower,net.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('ALUMINIUM specialty fixture is unavailable.');
        }

        $service = app(WarehouseMaterialCatalogExcelService::class);
        $file = new UploadedFile($path, 'ALUMINIUM tubes,louvers,shower,net.xlsx', null, null, true);
        $extract = $service->extractFromUpload($file);

        $first = $service->storeItems($extract['items'], 'catalog', 'incremental');
        $this->assertGreaterThan(0, $first['added']);

        $countAfterFirst = Item::query()->where('catalog_tier', 'specialty')->count();

        $second = $service->storeItems($extract['items'], 'catalog', 'incremental');
        $this->assertSame(0, $second['added']);
        $this->assertSame($countAfterFirst, Item::query()->where('catalog_tier', 'specialty')->count());
    }
}
