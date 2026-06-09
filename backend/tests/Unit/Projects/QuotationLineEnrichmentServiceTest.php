<?php

namespace Tests\Unit\Projects;

use App\Services\Projects\FabricationExcelExtractionService;
use App\Services\Projects\QuotationAccountingExcelExtractionService;
use App\Services\Projects\QuotationLineEnrichmentService;
use Tests\TestCase;

class QuotationLineEnrichmentServiceTest extends TestCase
{
    private QuotationAccountingExcelExtractionService $accounting;

    private FabricationExcelExtractionService $fabrication;

    private QuotationLineEnrichmentService $enrichment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accounting = app(QuotationAccountingExcelExtractionService::class);
        $this->fabrication = app(FabricationExcelExtractionService::class);
        $this->enrichment = app(QuotationLineEnrichmentService::class);
    }

    public function test_merges_fabrication_dimensions_and_profiles_by_code(): void
    {
        $accountingRows = $this->accounting->parseFile(base_path('../docs/excel dump.txt'), 'txt');
        $fabricationRows = $this->fabrication->parseFile(base_path('../docs/fabrication.txt'), 'txt');

        $accountingPayload = $this->accounting->buildExtractionPayload($accountingRows, 'excel dump.txt');
        $fabricationPayload = $this->fabrication->buildExtractionPayload($fabricationRows, 'fabrication.txt');

        $this->assertNull($accountingPayload['lines'][0]['width_mm']);
        $this->assertNull($accountingPayload['lines'][0]['height_mm']);

        $merged = $this->enrichment->enrich($accountingPayload, $fabricationPayload);

        $first = $merged['lines'][0];
        $this->assertSame('SD-1', $first['code']);
        $this->assertEqualsWithDelta(1408.0, $first['width_mm'], 0.01);
        $this->assertEqualsWithDelta(2090.0, $first['height_mm'], 0.01);
        $this->assertArrayHasKey('fabrication', $first['metadata']);
        $this->assertCount(2, $first['metadata']['fabrication']['sash_openings']);
        $this->assertSame('frame_profiles', $first['metadata']['accounting']['drawing']['elevation']['source']);

        $fourth = collect($merged['lines'])->firstWhere('code', 'SD-4');
        $this->assertNotNull($fourth);
        $this->assertEqualsWithDelta(2828.0, $fourth['width_mm'], 0.01);
        $this->assertEqualsWithDelta(1825.0, $fourth['height_mm'], 0.01);
    }

    public function test_returns_accounting_payload_unchanged_without_fabrication(): void
    {
        $rows = $this->accounting->parseFile(base_path('../docs/excel dump.txt'), 'txt');
        $payload = $this->accounting->buildExtractionPayload($rows, 'excel dump.txt');

        $merged = $this->enrichment->enrich($payload, null);

        $this->assertSame($payload, $merged);
    }
}
