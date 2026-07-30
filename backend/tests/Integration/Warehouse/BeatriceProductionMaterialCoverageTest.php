<?php

namespace Tests\Integration\Warehouse;

use App\Models\Warehouse\DoorType;
use App\Services\Projects\FabricationExcelExtractionService;
use App\Services\Projects\WincadBomLineBuilder;
use App\Services\Warehouse\MasterData\WarehouseMaterialCatalogExcelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BeatriceProductionMaterialCoverageTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<int, string> */
    private const BEATRICE_PROFILE_CODES = [
        'PY08', 'PY06', 'PY43', 'PY51', 'PY10', 'WY-82827', 'PY24', 'PY25', 'PY35', 'PY52',
    ];

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

    public function test_standard_catalog_import_resolves_beatrice_fabrication_bom_lines(): void
    {
        $standardPath = base_path('../docs/STANDARD.xlsx');
        $fabricationPath = base_path('tests/Fixtures/BEATRICE_FABRICATION_LIST.xls');

        if (! is_readable($standardPath) || ! is_readable($fabricationPath)) {
            $this->markTestSkipped('STANDARD.xlsx or BEATRICE_FABRICATION_LIST.xls fixture is unavailable.');
        }

        $catalogService = app(WarehouseMaterialCatalogExcelService::class);
        $standardFile = new UploadedFile($standardPath, 'STANDARD.xlsx', null, null, true);
        $extract = $catalogService->extractFromUpload($standardFile);
        $catalogService->storeItems($extract['items']);

        $fabricationService = app(FabricationExcelExtractionService::class);
        $rows = $fabricationService->parseFile($fabricationPath, 'xls');
        $fabricationPayload = $fabricationService->buildExtractionPayload($rows, 'BEATRICE_FABRICATION_LIST.xls');

        $bomPayload = app(WincadBomLineBuilder::class)->build(
            $fabricationPayload,
            'BEATRICE_FABRICATION_LIST.xls',
        );

        $profileLines = collect($bomPayload['lines'])
            ->where('line_type', 'aluminium_profile')
            ->values();

        $this->assertGreaterThan(0, $profileLines->count());

        $matchedCodes = [];
        $unmatchedCodes = [];

        foreach (self::BEATRICE_PROFILE_CODES as $code) {
            $line = $profileLines->first(fn (array $row) => strcasecmp((string) ($row['material_code'] ?? ''), $code) === 0);
            if ($line === null) {
                continue;
            }

            if (($line['resolution_status'] ?? null) === 'matched') {
                $matchedCodes[] = $code;
            } else {
                $unmatchedCodes[] = $code;
            }
        }

        $this->assertGreaterThanOrEqual(
            8,
            count($matchedCodes),
            'Expected most BEATRICE profile codes to match after STANDARD catalog import. Unmatched: '.implode(', ', $unmatchedCodes),
        );

        $hardwareLines = collect($bomPayload['lines'])
            ->where('line_type', 'accessory')
            ->unique('material_name')
            ->values();

        $roller = $hardwareLines->first(fn (array $row) => ($row['material_name'] ?? '') === 'Roller 90 SD');
        $lock = $hardwareLines->first(fn (array $row) => ($row['material_name'] ?? '') === 'Lock 90 SD');

        $this->assertNotNull($roller);
        $this->assertSame('matched', $roller['resolution_status']);
        $this->assertNotNull($lock);
        $this->assertSame('matched', $lock['resolution_status']);

        $glassLines = collect($bomPayload['lines'])->where('line_type', 'glass');
        $this->assertTrue($glassLines->every(fn (array $row) => ($row['resolution_status'] ?? null) === 'procurement_only'));
    }
}
