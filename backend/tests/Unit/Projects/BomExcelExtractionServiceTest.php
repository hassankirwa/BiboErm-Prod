<?php

namespace Tests\Unit\Projects;

use App\Models\Warehouse\Item;
use App\Services\Projects\BomExcelExtractionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BomExcelExtractionServiceTest extends TestCase
{
    use RefreshDatabase;

    private BomExcelExtractionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(BomExcelExtractionService::class);
    }

    public function test_glass_and_addon_lines_are_procurement_only_even_with_material_code(): void
    {
        $payload = $this->service->buildExtractionPayload([
            [
                'row_number' => 2,
                'line_type' => 'glass',
                'material_code' => 'GLASS-01',
                'material_name' => 'Double glazed unit',
                'quantity' => 4,
            ],
            [
                'row_number' => 3,
                'line_type' => 'addon',
                'material_code' => 'ADDON-LOCK',
                'material_name' => 'Smart lock kit',
                'quantity' => 2,
            ],
        ]);

        $this->assertSame(2, $payload['summary']['procurement_only']);
        $this->assertSame(0, $payload['summary']['matched']);
        $this->assertSame(0, $payload['summary']['unmatched']);

        foreach ($payload['lines'] as $line) {
            $this->assertSame('procurement_only', $line['resolution_status']);
            $this->assertNull($line['warehouse_item_id']);
            $this->assertFalse($line['warehouse_match']);
        }
    }

    public function test_stockable_line_with_empty_code_is_unmatched(): void
    {
        $payload = $this->service->buildExtractionPayload([
            [
                'row_number' => 4,
                'line_type' => 'aluminium_profile',
                'material_code' => null,
                'material_name' => 'Custom glass bead',
                'quantity' => 6,
            ],
        ]);

        $line = $payload['lines'][0];
        $this->assertSame('unmatched', $line['resolution_status']);
        $this->assertNull($line['warehouse_item_id']);
        $this->assertSame(1, $payload['summary']['unmatched']);
    }

    public function test_stockable_line_resolves_sku_against_warehouse_items(): void
    {
        $item = Item::query()->create([
            'sku' => 'PROF-SLD-80MM',
            'name' => '80mm Sliding Frame Profile',
            'category' => 'aluminium_profile',
            'unit_of_measure' => 'length',
            'is_active' => true,
        ]);

        $payload = $this->service->buildExtractionPayload([
            [
                'row_number' => 2,
                'line_type' => 'aluminium_profile',
                'material_code' => 'PROF-SLD-80MM',
                'material_name' => '80mm Sliding Frame Profile',
                'quantity' => 12,
                'measurement_mm' => 2400,
                'notes' => 'Ground floor frames',
            ],
        ]);

        $line = $payload['lines'][0];
        $this->assertSame('matched', $line['resolution_status']);
        $this->assertTrue($line['warehouse_match']);
        $this->assertSame($item->id, $line['warehouse_item_id']);
        $this->assertSame(2400, $line['measurement_mm']);
        $this->assertSame(1, $payload['summary']['matched']);
    }

    public function test_unknown_sku_is_unmatched(): void
    {
        $payload = $this->service->buildExtractionPayload([
            [
                'row_number' => 5,
                'line_type' => 'accessory',
                'material_code' => 'UNKNOWN-SKU',
                'material_name' => 'Mystery part',
                'quantity' => 1,
            ],
        ]);

        $this->assertSame('unmatched', $payload['lines'][0]['resolution_status']);
        $this->assertSame(1, $payload['summary']['unmatched']);
    }

    public function test_csv_parsing_honors_column_aliases(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'bom-csv-');
        file_put_contents($path, implode("\n", [
            'Material Name,Material Code,Quantity,Line Type,Length (mm),Notes',
            'Handle set,HDL-01,3,accessory,,Main door',
            'Glass panel,,2,glass,1200,No SKU',
        ]));

        $rawLines = $this->service->parseFile($path, 'csv');
        @unlink($path);

        $this->assertCount(2, $rawLines);
        $this->assertSame('Handle set', $rawLines[0]['material_name']);
        $this->assertSame('HDL-01', $rawLines[0]['material_code']);
        $this->assertSame('glass', $rawLines[1]['line_type']);
        $this->assertNull($rawLines[1]['material_code']);

        $payload = $this->service->buildExtractionPayload($rawLines);
        $this->assertSame(1, $payload['summary']['procurement_only']);
    }

    public function test_xlsx_parsing_reads_first_worksheet_with_bom_columns(): void
    {
        $path = $this->createMinimalXlsx([
            ['Material Name', 'Material Code', 'Quantity', 'Line Type', 'Length (mm)', 'Notes'],
            ['Handle set', 'HDL-01', '3', 'accessory', '', 'Main door'],
            ['Glass panel', '', '2', 'glass', '1200', 'No SKU'],
        ], 'BOM');

        $rawLines = $this->service->parseFile($path, 'xlsx');
        @unlink($path);

        $this->assertCount(2, $rawLines);
        $this->assertSame('Handle set', $rawLines[0]['material_name']);
        $this->assertSame('HDL-01', $rawLines[0]['material_code']);
        $this->assertSame(3.0, $rawLines[0]['quantity']);
        $this->assertSame('glass', $rawLines[1]['line_type']);
        $this->assertSame(1200, $rawLines[1]['measurement_mm']);
        $this->assertNull($rawLines[1]['material_code']);
    }

    public function test_xlsx_parsing_uses_workbook_order_not_hardcoded_sheet1(): void
    {
        $path = $this->createMinimalXlsx(
            rows: [
                ['Material Name', 'Quantity', 'Line Type'],
                ['Ignored row', '1', 'accessory'],
            ],
            sheetName: 'Ignored',
            worksheetFile: 'sheet1.xml',
            additionalWorksheets: [
                'sheet2.xml' => [
                    ['Material Name', 'Quantity', 'Line Type'],
                    ['Used row', '4', 'accessory'],
                ],
            ],
            workbookSheetOrder: ['sheet2.xml', 'sheet1.xml'],
        );

        $rawLines = $this->service->parseFile($path, 'xlsx');
        @unlink($path);

        $this->assertCount(1, $rawLines);
        $this->assertSame('Used row', $rawLines[0]['material_name']);
        $this->assertSame(4.0, $rawLines[0]['quantity']);
    }

    public function test_xlsx_without_sheet_data_returns_validation_error(): void
    {
        $path = $this->createMinimalXlsx([], 'BOM', includeSheetData: false);

        try {
            $this->service->parseFile($path, 'xlsx');
            $this->fail('Expected ValidationException was not thrown.');
        } catch (\Illuminate\Validation\ValidationException $exception) {
            $this->assertStringContainsString(
                'The Excel worksheet "BOM" does not contain any row data.',
                $exception->errors()['file'][0],
            );
        } finally {
            @unlink($path);
        }
    }

    public function test_xlsx_parsing_handles_prefixed_namespace_and_inline_strings(): void
    {
        $path = $this->createCustomXlsx([
            'xl/worksheets/sheet1.xml' => <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <x:sheetData>
    <x:row r="1">
      <x:c r="A1" t="inlineStr"><x:is><x:t>Material Name</x:t></x:is></x:c>
      <x:c r="B1" t="inlineStr"><x:is><x:t>Quantity</x:t></x:is></x:c>
      <x:c r="C1" t="inlineStr"><x:is><x:t>Line Type</x:t></x:is></x:c>
    </x:row>
    <x:row r="2">
      <x:c r="A2" t="inlineStr"><x:is><x:t>Handle set</x:t></x:is></x:c>
      <x:c r="B2"><x:v>3</x:v></x:c>
      <x:c r="C2" t="inlineStr"><x:is><x:t>accessory</x:t></x:is></x:c>
    </x:row>
  </x:sheetData>
</x:worksheet>
XML,
        ]);

        $rawLines = $this->service->parseFile($path, 'xlsx');
        @unlink($path);

        $this->assertCount(1, $rawLines);
        $this->assertSame('Handle set', $rawLines[0]['material_name']);
        $this->assertSame(3.0, $rawLines[0]['quantity']);
    }

    public function test_xlsx_parsing_skips_empty_first_sheet_and_reads_next_sheet(): void
    {
        $path = $this->createCustomXlsx([
            'xl/worksheets/sheet1.xml' => <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData/>
</worksheet>
XML,
            'xl/worksheets/sheet2.xml' => <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Material Name</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Quantity</t></is></c>
      <c r="C1" t="inlineStr"><is><t>Line Type</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Used row</t></is></c>
      <c r="B2"><v>4</v></c>
      <c r="C2" t="inlineStr"><is><t>accessory</t></is></c>
    </row>
  </sheetData>
</worksheet>
XML,
        ], [
            ['name' => 'Empty', 'file' => 'sheet1.xml', 'rId' => 'rId1'],
            ['name' => 'BOM', 'file' => 'sheet2.xml', 'rId' => 'rId2'],
        ]);

        $rawLines = $this->service->parseFile($path, 'xlsx');
        @unlink($path);

        $this->assertCount(1, $rawLines);
        $this->assertSame('Used row', $rawLines[0]['material_name']);
        $this->assertSame(4.0, $rawLines[0]['quantity']);
    }

    public function test_xlsx_fixture_file_parses_bom_columns(): void
    {
        $fixturePath = $this->ensureBomXlsxFixture();
        $rawLines = $this->service->parseFile($fixturePath, 'xlsx');

        $this->assertGreaterThanOrEqual(2, count($rawLines));
        $this->assertSame('Handle set', $rawLines[0]['material_name']);
        $this->assertSame('HDL-01', $rawLines[0]['material_code']);
    }

    public function test_xlsx_parsing_handles_cells_without_column_references(): void
    {
        $path = $this->createCustomXlsx([
            'xl/worksheets/sheet1.xml' => <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c t="inlineStr"><is><t>Material Name</t></is></c>
      <c t="inlineStr"><is><t>Material Code</t></is></c>
      <c t="inlineStr"><is><t>Quantity</t></is></c>
      <c t="inlineStr"><is><t>Line Type</t></is></c>
      <c t="inlineStr"><is><t>Length (mm)</t></is></c>
      <c t="inlineStr"><is><t>Notes</t></is></c>
    </row>
    <row r="2">
      <c t="inlineStr"><is><t>80mm Sliding Frame Profile</t></is></c>
      <c t="inlineStr"><is><t>PROF-SLD-80MM</t></is></c>
      <c><v>12</v></c>
      <c t="inlineStr"><is><t>aluminium_profile</t></is></c>
      <c><v>2400</v></c>
      <c t="inlineStr"><is><t>Ground floor frames</t></is></c>
    </row>
    <row r="3">
      <c t="inlineStr"><is><t>Glass panel</t></is></c>
      <c t="inlineStr"><is></is></c>
      <c><v>2</v></c>
      <c t="inlineStr"><is><t>glass</t></is></c>
      <c><v>1200</v></c>
      <c t="inlineStr"><is><t>No SKU</t></is></c>
    </row>
  </sheetData>
</worksheet>
XML,
        ]);

        $rawLines = $this->service->parseFile($path, 'xlsx');
        @unlink($path);

        $this->assertCount(2, $rawLines);
        $this->assertSame('80mm Sliding Frame Profile', $rawLines[0]['material_name']);
        $this->assertSame('PROF-SLD-80MM', $rawLines[0]['material_code']);
        $this->assertSame(12.0, $rawLines[0]['quantity']);
        $this->assertSame('aluminium_profile', $rawLines[0]['line_type']);
        $this->assertSame(2400, $rawLines[0]['measurement_mm']);
        $this->assertSame('Ground floor frames', $rawLines[0]['notes']);
        $this->assertSame('glass', $rawLines[1]['line_type']);
        $this->assertNull($rawLines[1]['material_code']);
    }

    public function test_xlsx_parsing_scans_first_rows_for_header_and_parses_decimal_quantity(): void
    {
        $path = $this->createCustomXlsx([
            'xl/worksheets/sheet1.xml' => <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Project BOM</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Material Name</t></is></c>
      <c r="B2" t="inlineStr"><is><t>Material Code</t></is></c>
      <c r="C2" t="inlineStr"><is><t>Quantity</t></is></c>
      <c r="D2" t="inlineStr"><is><t>Line Type</t></is></c>
      <c r="E2" t="inlineStr"><is><t>Length (mm)</t></is></c>
      <c r="F2" t="inlineStr"><is><t>Notes</t></is></c>
    </row>
    <row r="3">
      <c r="A3" t="inlineStr"><is><t>80mm Sliding Frame Profile</t></is></c>
      <c r="B3" t="inlineStr"><is><t>PROF-SLD-80MM</t></is></c>
      <c r="C3"><v>12.00</v></c>
      <c r="D3" t="inlineStr"><is><t>aluminium_profile</t></is></c>
      <c r="E3"><v>2400</v></c>
      <c r="F3" t="inlineStr"><is><t>Ground floor frames</t></is></c>
    </row>
    <row r="4">
      <c r="A4" t="inlineStr"><is><t>Glass panel</t></is></c>
      <c r="C4"><v>2</v></c>
      <c r="D4" t="inlineStr"><is><t>glass</t></is></c>
      <c r="E4"><v>1200</v></c>
      <c r="F4" t="inlineStr"><is><t>No SKU</t></is></c>
    </row>
  </sheetData>
</worksheet>
XML,
        ]);

        $rawLines = $this->service->parseFile($path, 'xlsx');
        @unlink($path);

        $this->assertCount(2, $rawLines);
        $this->assertSame(12.0, $rawLines[0]['quantity']);
        $this->assertSame('glass', $rawLines[1]['line_type']);
        $this->assertNull($rawLines[1]['material_code']);
    }

    /**
     * @param  array<string, string>  $worksheetXmlByPath
     * @param  array<int, array{name: string, file: string, rId: string}>|null  $sheetOrder
     */
    private function createCustomXlsx(array $worksheetXmlByPath, ?array $sheetOrder = null): string
    {
        $path = tempnam(sys_get_temp_dir(), 'bom-xlsx-custom-').'.xlsx';
        @unlink($path);

        $zip = new \ZipArchive();
        $zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $sheetOrder ??= [[
            'name' => 'BOM',
            'file' => basename((string) array_key_first($worksheetXmlByPath)),
            'rId' => 'rId1',
        ]];

        $relationships = [];
        $workbookSheets = [];
        foreach ($sheetOrder as $index => $sheet) {
            $relationships[] = sprintf(
                '<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/%s"/>',
                $sheet['rId'],
                $sheet['file'],
            );
            $workbookSheets[] = sprintf(
                '<sheet name="%s" sheetId="%d" r:id="%s"/>',
                htmlspecialchars($sheet['name'], ENT_QUOTES),
                $index + 1,
                $sheet['rId'],
            );
        }

        foreach ($worksheetXmlByPath as $relativePath => $xml) {
            $entryPath = str_starts_with($relativePath, 'xl/')
                ? $relativePath
                : 'xl/'.$relativePath;
            $zip->addFromString($entryPath, $xml);
        }

        $zip->addFromString(
            'xl/workbook.xml',
            sprintf(
                <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>%s</sheets>
</workbook>
XML,
                implode('', $workbookSheets),
            ),
        );

        $zip->addFromString(
            'xl/_rels/workbook.xml.rels',
            sprintf(
                <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  %s
</Relationships>
XML,
                implode('', $relationships),
            ),
        );

        $zip->close();

        return $path;
    }

    private function ensureBomXlsxFixture(): string
    {
        $fixtureDir = base_path('tests/fixtures/bom');
        if (! is_dir($fixtureDir)) {
            mkdir($fixtureDir, 0777, true);
        }

        $fixturePath = $fixtureDir.'/sample-bom.xlsx';
        if (! is_file($fixturePath)) {
            $generatedPath = $this->createMinimalXlsx([
                ['Material Name', 'Material Code', 'Quantity', 'Line Type', 'Length (mm)', 'Notes'],
                ['Handle set', 'HDL-01', '3', 'accessory', '', 'Main door'],
                ['Glass panel', '', '2', 'glass', '1200', 'No SKU'],
            ], 'BOM');
            copy($generatedPath, $fixturePath);
            @unlink($generatedPath);
        }

        return $fixturePath;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @param  array<string, array<int, array<int, string>>>  $additionalWorksheets
     * @param  array<int, string>|null  $workbookSheetOrder
     */
    private function createMinimalXlsx(
        array $rows,
        string $sheetName = 'Sheet1',
        string $worksheetFile = 'sheet1.xml',
        bool $includeSheetData = true,
        array $additionalWorksheets = [],
        ?array $workbookSheetOrder = null,
    ): string {
        $path = tempnam(sys_get_temp_dir(), 'bom-xlsx-').'.xlsx';
        @unlink($path);

        $zip = new \ZipArchive();
        $zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $sharedStrings = [];
        $sharedStringIndexByValue = [];

        $resolveSharedStringIndex = function (string $value) use (&$sharedStrings, &$sharedStringIndexByValue): int {
            if (array_key_exists($value, $sharedStringIndexByValue)) {
                return $sharedStringIndexByValue[$value];
            }

            $index = count($sharedStrings);
            $sharedStrings[] = $value;
            $sharedStringIndexByValue[$value] = $index;

            return $index;
        };

        $buildWorksheetXml = function (array $worksheetRows) use ($includeSheetData, $resolveSharedStringIndex): string {
            if (! $includeSheetData) {
                return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
</worksheet>
XML;
            }

            $sheetDataRows = [];
            foreach ($worksheetRows as $rowIndex => $rowValues) {
                $cells = [];
                foreach ($rowValues as $columnIndex => $value) {
                    $column = $this->columnLettersFromIndex($columnIndex);
                    $cellRef = $column.($rowIndex + 1);
                    $sharedIndex = $resolveSharedStringIndex($value);
                    $cells[] = sprintf(
                        '<c r="%s" t="s"><v>%d</v></c>',
                        $cellRef,
                        $sharedIndex,
                    );
                }

                $sheetDataRows[] = sprintf(
                    '<row r="%d">%s</row>',
                    $rowIndex + 1,
                    implode('', $cells),
                );
            }

            return sprintf(
                <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>%s</sheetData>
</worksheet>
XML,
                implode('', $sheetDataRows),
            );
        };

        $worksheetFiles = [$worksheetFile => $rows];
        foreach ($additionalWorksheets as $fileName => $worksheetRows) {
            $worksheetFiles[$fileName] = $worksheetRows;
        }

        $orderedWorksheetFiles = $workbookSheetOrder ?? array_keys($worksheetFiles);
        $relationships = [];
        $workbookSheets = [];

        foreach ($orderedWorksheetFiles as $index => $fileName) {
            if (! array_key_exists($fileName, $worksheetFiles)) {
                continue;
            }

            $relationshipId = 'rId'.($index + 2);
            $relationships[] = sprintf(
                '<Relationship Id="%s" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/%s"/>',
                $relationshipId,
                $fileName,
            );

            $displayName = $fileName === $worksheetFile ? $sheetName : pathinfo($fileName, PATHINFO_FILENAME);
            $sheetId = $index + 1;
            $workbookSheets[] = sprintf(
                '<sheet name="%s" sheetId="%d" r:id="%s"/>',
                htmlspecialchars($displayName, ENT_QUOTES),
                $sheetId,
                $relationshipId,
            );

            $zip->addFromString(
                'xl/worksheets/'.$fileName,
                $buildWorksheetXml($worksheetFiles[$fileName]),
            );
        }

        $sharedStringXmlItems = array_map(
            fn (string $value): string => '<si><t>'.htmlspecialchars($value, ENT_QUOTES).'</t></si>',
            $sharedStrings,
        );

        $zip->addFromString(
            'xl/sharedStrings.xml',
            sprintf(
                <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%1$d" uniqueCount="%1$d">%2$s</sst>
XML,
                count($sharedStringXmlItems),
                implode('', $sharedStringXmlItems),
            ),
        );

        $zip->addFromString(
            'xl/workbook.xml',
            sprintf(
                <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>%s</sheets>
</workbook>
XML,
                implode('', $workbookSheets),
            ),
        );

        $zip->addFromString(
            'xl/_rels/workbook.xml.rels',
            sprintf(
                <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  %s
</Relationships>
XML,
                implode('', $relationships),
            ),
        );

        $zip->addFromString('[Content_Types].xml', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>
XML);

        $zip->addFromString('_rels/.rels', <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
XML);

        $zip->close();

        return $path;
    }

    private function columnLettersFromIndex(int $index): string
    {
        $letters = '';
        $value = $index + 1;

        while ($value > 0) {
            $remainder = ($value - 1) % 26;
            $letters = chr(65 + $remainder).$letters;
            $value = intdiv($value - 1, 26);
        }

        return $letters;
    }
}
