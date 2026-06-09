<?php

namespace Tests\Unit\Projects;

use App\Services\Projects\FabricationExcelExtractionService;
use Tests\TestCase;

class FabricationExcelExtractionServiceTest extends TestCase
{
    private FabricationExcelExtractionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(FabricationExcelExtractionService::class);
    }

    public function test_extracts_four_items_from_beatrice_fabrication_workbook(): void
    {
        $path = base_path('tests/Fixtures/BEATRICE_FABRICATION_LIST.xls');
        $this->assertFileExists($path);

        $rows = $this->service->parseFile($path, 'xls');
        $payload = $this->service->buildExtractionPayload($rows, 'BEATRICE_FABRICATION_LIST.xls');

        $this->assertSame('BEATRICE', $payload['project']['name']);
        $this->assertSame('202604211407', $payload['project']['order_no']);
        $this->assertSame('2026年05月21日', $payload['project']['delivery_date']);
        $this->assertSame(4, $payload['summary']['total_items']);
        $this->assertCount(4, $payload['items']);
        $this->assertArrayNotHasKey('lines', $payload);
        $this->assertArrayNotHasKey('project_name', $payload);
        $this->assertArrayNotHasKey('delivery_date_iso', $payload['project']);

        $codes = array_column($payload['items'], 'code');
        $this->assertSame(['SD-1', 'SD-2', 'SD-3', 'SD-4'], $codes);

        $first = $payload['items'][0];
        $this->assertSame('S90 Sliding 推拉门', $first['series']);
        $this->assertSame(1.0, $first['quantity']);
        $this->assertSame('深灰色深灰色', $first['colour']);
        $this->assertArrayNotHasKey('quotation_line', $first);
        $this->assertArrayNotHasKey('delivery_date_iso', $first['project']);

        $this->assertSame(3.02, $first['dimensions']['sqm']);
        $this->assertSame(14.26, $first['dimensions']['weight_kg']);
        $this->assertSame(0.0, $first['dimensions']['sill_height']);
        $this->assertSame(2090.0, $first['dimensions']['height_mm']);
        $this->assertSame(1408.0, $first['dimensions']['width_mm']);
        $this->assertSame('frame_profiles', $first['dimensions']['source']);

        $this->assertCount(3, $first['frame_profiles']);
        $this->assertSame('Side frame 边封', $first['frame_profiles'][0]['name']);
        $this->assertSame('PY08', $first['frame_profiles'][0]['code_no']);
        $this->assertSame(2090.0, $first['frame_profiles'][0]['length_mm']);

        $this->assertCount(3, $first['sash_profiles']);
        $this->assertSame('Lock profile 单玻光企', $first['sash_profiles'][0]['name']);

        $this->assertCount(3, $first['hardware']);
        $this->assertSame('Roller 90 SD', $first['hardware'][0]['name']);
        $this->assertSame('90推拉门 双轮 2pcs', $first['hardware'][0]['specification']);
        $this->assertSame(2.0, $first['hardware'][0]['qty']);

        $this->assertCount(1, $first['glass']);
        $this->assertSame('Reflective glass', trim($first['glass'][0]['name']));
        $this->assertSame(633.0, $first['glass'][0]['width_mm']);
        $this->assertSame(1961.0, $first['glass'][0]['height_mm']);
        $this->assertSame('6mm brown 镀膜棕玻', $first['glass'][0]['specification']);

        $this->assertCount(2, $first['sash_openings']);
        $this->assertSame('右推拉', $first['sash_openings'][0]['type']);
        $this->assertSame(728.8, $first['sash_openings'][0]['width_mm']);

        $this->assertSame(2090.0, $first['drawing']['elevation']['height_mm']);
        $this->assertSame(1408.0, $first['drawing']['elevation']['width_mm']);
        $this->assertSame('frame_profiles', $first['drawing']['elevation']['source']);

        $third = $payload['items'][2];
        $this->assertSame('SD-3', $third['code']);
        $this->assertCount(7, $third['frame_profiles']);
        $this->assertCount(2, $third['glass']);

        $fourth = $payload['items'][3];
        $this->assertSame('SD-4', $fourth['code']);
        $this->assertSame(2828.0, $fourth['dimensions']['width_mm']);
        $this->assertSame('frame_profiles', $fourth['dimensions']['source']);
    }

    public function test_build_payload_requires_at_least_one_item(): void
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $this->service->buildExtractionPayload([], 'empty.txt');
    }

    public function test_deprecated_quotation_service_alias_still_resolves(): void
    {
        $alias = app(\App\Services\Projects\QuotationExcelExtractionService::class);

        $this->assertInstanceOf(FabricationExcelExtractionService::class, $alias);
    }
}
