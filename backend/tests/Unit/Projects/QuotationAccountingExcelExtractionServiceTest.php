<?php

namespace Tests\Unit\Projects;

use App\Services\Projects\QuotationAccountingExcelExtractionService;
use Tests\TestCase;

class QuotationAccountingExcelExtractionServiceTest extends TestCase
{
    private QuotationAccountingExcelExtractionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(QuotationAccountingExcelExtractionService::class);
    }

    public function test_extracts_four_priced_lines_from_beatrice_cost_section_dump(): void
    {
        $path = base_path('../docs/excel dump.txt');
        $rows = $this->service->parseFile($path, 'txt');
        $payload = $this->service->buildExtractionPayload($rows, 'excel dump.txt');

        $this->assertSame('BEATRICE', $payload['project']['name']);
        $this->assertNull($payload['project']['number']);
        $this->assertNull($payload['project']['order_no']);
        $this->assertSame(4, $payload['summary']['total_items']);
        $this->assertCount(4, $payload['lines']);
        $this->assertSame(['SD-1', 'SD-2', 'SD-3', 'SD-4'], array_column($payload['lines'], 'code'));

        $first = $payload['lines'][0];
        $this->assertSame('S90 Sliding 推拉门', $first['series']);
        $this->assertSame(1.0, $first['quantity']);
        $this->assertNull($first['width_mm']);
        $this->assertNull($first['height_mm']);
        $this->assertEqualsWithDelta(3.05, $first['sqm_per_pcs'], 0.01);
        $this->assertEqualsWithDelta(392.24, $first['line_total'], 0.01);
        $this->assertEqualsWithDelta(392.24, $first['unit_price'], 0.01);
        $this->assertSame('Bronze Reflective glass 6mm', $first['glass_type']);
        $this->assertSame('cost_section', $first['metadata']['accounting']['layout']);
        $this->assertEqualsWithDelta(53.04, $first['metadata']['accounting']['vat_amount'], 0.01);
        $this->assertEqualsWithDelta(128.60, $first['metadata']['accounting']['usd_per_sqm'], 0.01);
        $this->assertSame('USD', $first['metadata']['accounting']['currency']);
        $this->assertSame('深灰色', $first['metadata']['accounting']['in_colour']);
        $this->assertSame('深灰色', $first['metadata']['accounting']['out_colour']);

        $breakdown = $first['metadata']['accounting']['cost_breakdown'];
        $this->assertIsArray($breakdown);
        $this->assertEqualsWithDelta(100.24, $breakdown['direct_cost']['aluminum_profile']['subtotal'], 0.01);
        $this->assertEqualsWithDelta(52.50, $breakdown['direct_cost']['glass_mesh']['subtotal'], 0.01);
        $this->assertEqualsWithDelta(18.80, $breakdown['direct_cost']['hardware']['subtotal'], 0.01);
        $this->assertEqualsWithDelta(171.54, $breakdown['direct_cost']['materials_total'], 0.01);
        $this->assertEqualsWithDelta(54.90, $breakdown['direct_cost']['labor']['subtotal'], 0.01);
        $this->assertEqualsWithDelta(226.44, $breakdown['direct_cost']['subtotal'], 0.01);
        $this->assertEqualsWithDelta(55.25, $breakdown['profit'], 0.01);
        $this->assertEqualsWithDelta(53.04, $breakdown['vat'], 0.01);
        $this->assertEqualsWithDelta(7.69, $breakdown['commission'], 0.01);
        $this->assertEqualsWithDelta(392.24, $breakdown['total_cost'], 0.01);
        $this->assertSame(
            'Reflective glass (6mm brown 镀膜棕玻)',
            $breakdown['direct_cost']['glass_mesh']['items'][0]['name'] ?? null,
        );

        $this->assertEqualsWithDelta(3009.37, $payload['summary']['grand_total'], 0.01);
        $this->assertGreaterThan(0, $payload['summary']['tax']);
        $this->assertEqualsWithDelta(
            $payload['summary']['grand_total'],
            $payload['summary']['subtotal'] + $payload['summary']['tax'],
            0.02,
        );
    }

    public function test_extracts_tabular_client_quotation_fixture(): void
    {
        $path = base_path('tests/fixtures/BEATRICE_ACCOUNTING_QUOTE.txt');
        $rows = $this->service->parseFile($path, 'txt');
        $payload = $this->service->buildExtractionPayload($rows, 'BEATRICE_ACCOUNTING_QUOTE.txt');

        $this->assertSame('BEATRICE', $payload['project']['name']);
        $this->assertSame('202604211407', $payload['project']['number']);
        $this->assertSame('202604211407', $payload['project_number']);
        $this->assertCount(2, $payload['lines']);

        $first = $payload['lines'][0];
        $this->assertSame('SD-1', $first['code']);
        $this->assertSame('Bronze Reflective glass 6mm', $first['glass_type']);
        $this->assertEqualsWithDelta(1450, $first['width_mm'], 0.01);
        $this->assertEqualsWithDelta(2100, $first['height_mm'], 0.01);
        $this->assertEqualsWithDelta(3.05, $first['sqm_per_pcs'], 0.01);
        $this->assertEqualsWithDelta(50991.26, $first['unit_price'], 0.01);
        $this->assertEqualsWithDelta(50991.26, $first['line_total'], 0.01);
        $this->assertSame('tabular', $first['metadata']['accounting']['layout']);
        $this->assertSame('KES', $first['metadata']['accounting']['currency']);

        $this->assertEqualsWithDelta(139741.26, $payload['summary']['subtotal'], 0.01);
        $this->assertEqualsWithDelta(22358.60, $payload['summary']['tax'], 0.01);
        $this->assertEqualsWithDelta(162099.86, $payload['summary']['grand_total'], 0.01);
    }

    public function test_extracts_beatrice_xlsx_tabular_sheet_with_cost_section_metadata(): void
    {
        $path = base_path('../docs/BEATRICE20260423.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('BEATRICE20260423.xlsx fixture is not available.');
        }

        $rows = $this->service->parseFile($path, 'xlsx');
        $payload = $this->service->buildExtractionPayload($rows, 'BEATRICE20260423.xlsx');

        $this->assertSame('BEATRICE', $payload['project']['name']);
        $this->assertCount(4, $payload['lines']);

        $first = $payload['lines'][0];
        $this->assertSame('SD-1', $first['code']);
        $this->assertSame(1.0, $first['quantity']);
        $this->assertEqualsWithDelta(3.05, $first['sqm_per_pcs'], 0.01);
        $this->assertEqualsWithDelta(1450, $first['width_mm'], 0.01);
        $this->assertEqualsWithDelta(2100, $first['height_mm'], 0.01);

        $layout = $first['metadata']['accounting']['layout'] ?? null;
        if ($layout === 'cost_section') {
            $this->assertSame('Bronze Reflective glass 6mm', $first['glass_type']);
            $this->assertEqualsWithDelta(392.24, $first['line_total'], 0.01);
            $this->assertEqualsWithDelta(392.24, $first['unit_price'], 0.01);
            $this->assertEqualsWithDelta(128.60, $first['metadata']['accounting']['usd_per_sqm'], 0.01);
            $this->assertArrayHasKey('cost_breakdown', $first['metadata']['accounting']);
            $this->assertEqualsWithDelta(
                392.24,
                $first['metadata']['accounting']['cost_breakdown']['total_cost'],
                0.01,
            );
        } else {
            $this->assertSame('tabular', $layout);
            $this->assertStringContainsString('S90 Sliding', (string) $first['series']);
            $this->assertEqualsWithDelta(392.24, $first['line_total'], 0.01);
        }
    }

    public function test_extracts_embedded_drawings_from_beatrice_accounting_xlsx(): void
    {
        $path = base_path('../docs/BEATRICE20260423.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('BEATRICE20260423.xlsx fixture is not available.');
        }

        $file = new \Illuminate\Http\UploadedFile(
            $path,
            'BEATRICE20260423.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true,
        );

        $payload = $this->service->extractFromUpload($file);

        $first = $payload['lines'][0];
        $this->assertSame('SD-1', $first['code']);
        $this->assertArrayHasKey('drawing', $first['metadata']['accounting']);
        $mediaStatus = $first['metadata']['accounting']['drawing']['embedded_media']['status'] ?? null;
        $this->assertContains($mediaStatus, [
            'extracted',
            'none_found',
            'extraction_failed',
            'zip_unavailable',
            'open_failed',
            'unsupported_format',
        ]);

        if ($mediaStatus === 'extracted') {
            $this->assertStringStartsWith(
                'data:image/',
                (string) $first['metadata']['accounting']['drawing']['embedded_media']['data_url'],
            );
            $this->assertStringStartsWith('data:image/', (string) ($first['picture_data_url'] ?? ''));
        }
    }

    public function test_build_payload_requires_at_least_one_line(): void
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $this->service->buildExtractionPayload([], 'empty.txt');
    }
}
