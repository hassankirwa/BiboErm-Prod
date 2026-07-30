<?php

namespace App\Services\Projects;

use App\Models\Warehouse\Item;
use App\Services\Warehouse\MasterData\SkuNormalizer;
use App\Services\Warehouse\MasterData\WarehouseItemResolver;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class BomExcelExtractionService
{
    /** @var array<string, list<string>> */
    protected const HEADER_ALIASES = [
        'material_name' => ['material name', 'material_name', 'description', 'name', 'item name', 'item'],
        'material_code' => ['material code', 'material_code', 'sku', 'code', 'item code'],
        'quantity' => ['quantity', 'qty', 'amount', 'count'],
        'line_type' => ['line type', 'line_type', 'type', 'category'],
        'measurement_mm' => ['length (mm)', 'length', 'measurement', 'measurement_mm', 'length mm'],
        'notes' => ['notes', 'note', 'comments', 'comment'],
    ];

    /** @var array<string, int> */
    protected array $skuToWarehouseItemId = [];

    public function __construct(
        protected WarehouseItemResolver $warehouseItems,
        protected SkuNormalizer $skuNormalizer,
    ) {}

    /**
     * @return array{
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_rows: int, matched: int, unmatched: int, procurement_only: int},
     *     source_filename: string|null
     * }
     */
    public function extractFromUpload(UploadedFile $file): array
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        $extension = strtolower((string) $file->getClientOriginalExtension());

        $rawLines = $this->parseFile($path, $extension);

        if ($rawLines === []) {
            throw ValidationException::withMessages([
                'file' => ['No BOM lines could be parsed from the upload.'],
            ]);
        }

        return $this->buildExtractionPayload($rawLines, $file->getClientOriginalName());
    }

    /**
     * @param  array<int, array<string, mixed>>  $rawLines
     * @return array{
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_rows: int, matched: int, unmatched: int, procurement_only: int},
     *     source_filename: string|null
     * }
     */
    public function buildExtractionPayload(array $rawLines, ?string $sourceFilename = null): array
    {
        $this->preloadSkuIndex($rawLines);

        $lines = [];
        $summary = [
            'total_rows' => 0,
            'matched' => 0,
            'unmatched' => 0,
            'procurement_only' => 0,
        ];

        foreach (array_values($rawLines) as $index => $rawLine) {
            $rowNumber = (int) ($rawLine['row_number'] ?? ($index + 2));
            $enriched = $this->enrichLine($rawLine, $rowNumber);
            $lines[] = $enriched;

            $summary['total_rows']++;
            $status = (string) $enriched['resolution_status'];
            if (isset($summary[$status])) {
                $summary[$status]++;
            }
        }

        return [
            'lines' => $lines,
            'summary' => $summary,
            'source_filename' => $sourceFilename,
        ];
    }

    /**
     * @param  array<string, mixed>  $rawLine
     * @return array<string, mixed>
     */
    public function enrichLine(array $rawLine, int $rowNumber): array
    {
        $lineType = $this->normalizeLineType((string) ($rawLine['line_type'] ?? 'accessory'));
        $materialCode = $this->normalizeMaterialCode($rawLine['material_code'] ?? null);
        $materialName = trim((string) ($rawLine['material_name'] ?? ''));
        $quantity = (float) ($rawLine['quantity'] ?? 0);
        $measurementMm = isset($rawLine['measurement_mm']) && $rawLine['measurement_mm'] !== ''
            ? (int) $rawLine['measurement_mm']
            : null;
        $notes = isset($rawLine['notes']) ? trim((string) $rawLine['notes']) : null;
        $notes = $notes === '' ? null : $notes;

        $isProcurementOnlyType = $this->isProcurementOnlyLineType($lineType);
        $warehouseItemId = null;
        $warehouseMatch = false;

        if (! $isProcurementOnlyType && ($materialCode !== null || $materialName !== '')) {
            $warehouseItemId = $this->resolveWarehouseItemId(
                $materialCode,
                $materialName !== '' ? $materialName : null,
                $rawLine['source_system'] ?? null,
                $rawLine['series'] ?? null,
                $lineType,
            );
            $warehouseMatch = $warehouseItemId !== null;
        }

        $resolutionStatus = $this->resolveStatus($isProcurementOnlyType, $materialCode, $warehouseMatch);

        if ($isProcurementOnlyType) {
            $warehouseItemId = null;
            $warehouseMatch = false;
        }

        return [
            'row_number' => $rowNumber,
            'material_name' => $materialName,
            'material_code' => $materialCode,
            'quantity' => $quantity,
            'line_type' => $lineType,
            'measurement_mm' => $measurementMm,
            'unit_of_measure' => $this->normalizeMaterialCode($rawLine['unit_of_measure'] ?? $rawLine['uom'] ?? null),
            'width_mm' => isset($rawLine['width_mm']) && $rawLine['width_mm'] !== ''
                ? (int) $rawLine['width_mm']
                : null,
            'height_mm' => isset($rawLine['height_mm']) && $rawLine['height_mm'] !== ''
                ? (int) $rawLine['height_mm']
                : null,
            'opening_code' => $this->normalizeMaterialCode($rawLine['opening_code'] ?? null),
            'source_system' => $this->normalizeMaterialCode($rawLine['source_system'] ?? null),
            'series' => isset($rawLine['series']) && trim((string) $rawLine['series']) !== ''
                ? trim((string) $rawLine['series'])
                : null,
            'compatible_profile_code' => $this->normalizeMaterialCode($rawLine['compatible_profile_code'] ?? null),
            'notes' => $notes,
            'warehouse_item_id' => $warehouseItemId,
            'warehouse_match' => $warehouseMatch,
            'resolution_status' => $resolutionStatus,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function parseFile(string $path, string $extension): array
    {
        return match ($extension) {
            'csv', 'txt' => $this->parseCsv($path),
            'json' => $this->parseJson($path),
            'xls', 'xlsx' => $this->parseXlsx($path),
            default => throw ValidationException::withMessages([
                'file' => ['Unsupported BOM file format. Use .xlsx, .xls, .csv, or .json.'],
            ]),
        };
    }

    protected function normalizeLineType(string $lineType): string
    {
        $normalized = strtolower(trim($lineType));

        return $normalized !== '' ? $normalized : 'accessory';
    }

    protected function normalizeMaterialCode(mixed $code): ?string
    {
        if ($code === null) {
            return null;
        }

        $normalized = trim((string) $code);

        return $normalized !== '' ? $normalized : null;
    }

    protected function isProcurementOnlyLineType(string $lineType): bool
    {
        return in_array($lineType, ['glass', 'addon'], true);
    }

    protected function resolveStatus(bool $isProcurementOnlyType, ?string $materialCode, bool $warehouseMatch): string
    {
        if ($isProcurementOnlyType) {
            return 'procurement_only';
        }

        if ($warehouseMatch) {
            return 'matched';
        }

        if ($materialCode === null) {
            return 'unmatched';
        }

        return 'unmatched';
    }

    /**
     * @param  array<int, array<string, mixed>>  $rawLines
     */
    protected function preloadSkuIndex(array $rawLines): void
    {
        $codes = [];
        foreach ($rawLines as $rawLine) {
            $lineType = $this->normalizeLineType((string) ($rawLine['line_type'] ?? 'accessory'));
            if ($this->isProcurementOnlyLineType($lineType)) {
                continue;
            }

            $code = $this->normalizeMaterialCode($rawLine['material_code'] ?? null);
            if ($code !== null) {
                foreach ($this->skuNormalizer->variants($code) as $variant) {
                    $codes[] = $variant;
                }
            }
        }

        $codes = array_values(array_unique($codes));
        if ($codes === []) {
            $this->skuToWarehouseItemId = [];

            return;
        }

        $this->skuToWarehouseItemId = Item::query()
            ->whereIn('sku', $codes)
            ->pluck('id', 'sku')
            ->all();
    }

    protected function resolveWarehouseItemId(
        ?string $materialCode,
        ?string $materialName = null,
        ?string $sourceSystem = null,
        ?string $series = null,
        ?string $lineType = null,
    ): ?int
    {
        $id = null;
        foreach ($this->skuNormalizer->variants($materialCode) as $variant) {
            $id = $this->skuToWarehouseItemId[$variant] ?? null;
            if ($id !== null) {
                return (int) $id;
            }
        }

        return $this->warehouseItems->resolve(
            code: $materialCode,
            name: $materialName,
            sourceSystem: $sourceSystem ?: 'wincad',
            series: $series,
            lineType: $lineType,
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function parseCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if (! is_resource($handle)) {
            return [];
        }

        $headerCells = fgetcsv($handle) ?: [];
        $headerMap = $this->buildHeaderMapFromIndexedCells($headerCells);
        $lines = [];
        $rowNumber = 2;

        while (($row = fgetcsv($handle)) !== false) {
            if ($headerMap === []) {
                $rowNumber++;

                continue;
            }

            $data = $this->rowValuesFromIndexedCells($row, $headerMap);
            $parsed = $this->mapRowToRawLine($data, $rowNumber);
            if ($parsed !== null) {
                $lines[] = $parsed;
            }

            $rowNumber++;
        }

        fclose($handle);

        return $lines;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function parseJson(string $path): array
    {
        $contents = file_get_contents($path);
        $decoded = json_decode((string) $contents, true);

        if (! is_array($decoded)) {
            return [];
        }

        $lines = $decoded['lines'] ?? $decoded;
        if (! is_array($lines)) {
            return [];
        }

        $rawLines = [];
        foreach (array_values($lines) as $index => $line) {
            if (! is_array($line)) {
                continue;
            }

            $materialName = trim((string) ($line['material_name'] ?? $line['material name'] ?? ''));
            $quantity = (float) ($line['quantity'] ?? $line['qty'] ?? 0);

            if ($materialName === '' || $quantity <= 0) {
                continue;
            }

            $rawLines[] = [
                'row_number' => (int) ($line['row_number'] ?? ($index + 1)),
                'line_type' => $line['line_type'] ?? $line['line type'] ?? 'accessory',
                'material_code' => $line['material_code'] ?? $line['material code'] ?? $line['sku'] ?? null,
                'material_name' => $materialName,
                'quantity' => $quantity,
                'measurement_mm' => $line['measurement_mm'] ?? $line['length (mm)'] ?? null,
                'notes' => $line['notes'] ?? null,
            ];
        }

        return $rawLines;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function parseXlsx(string $path): array
    {
        if (! class_exists(\ZipArchive::class)) {
            throw ValidationException::withMessages([
                'file' => ['Excel import requires the PHP zip extension.'],
            ]);
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return $this->parseXlsxFallbackAsCsv($path, 'Unable to read the Excel file.');
        }

        $sharedStrings = $this->parseSharedStrings($zip->getFromName('xl/sharedStrings.xml'));
        $worksheets = $this->resolveWorksheets($zip);

        $lastSheetLabel = null;
        $sawWorksheetRows = false;
        foreach ($worksheets as $worksheet) {
            $lastSheetLabel = $worksheet['name'];
            $sheetXml = $zip->getFromName($worksheet['path']);
            if ($sheetXml === false) {
                continue;
            }

            $worksheetParse = $this->parseWorksheetXml($sheetXml, $sharedStrings);
            if ($worksheetParse['raw_row_count'] > 0) {
                $sawWorksheetRows = true;
            }

            if ($worksheetParse['lines'] !== []) {
                $zip->close();

                return $worksheetParse['lines'];
            }
        }

        $zip->close();

        if ($worksheets === []) {
            throw ValidationException::withMessages([
                'file' => ['The Excel file does not contain a readable worksheet.'],
            ]);
        }

        $sheetLabel = $lastSheetLabel ?? 'worksheet';
        $csvLines = $this->tryParseSpreadsheetAsCsv($path);
        if ($csvLines !== []) {
            return $csvLines;
        }

        if ($sawWorksheetRows) {
            throw ValidationException::withMessages([
                'file' => [
                    sprintf(
                        'The Excel worksheet "%s" has rows but no valid BOM lines were found. Ensure the first row includes "Material Name" and "Quantity" columns with data starting on row 2.',
                        $sheetLabel,
                    ),
                ],
            ]);
        }

        throw ValidationException::withMessages([
            'file' => [
                sprintf(
                    'The Excel worksheet "%s" does not contain any row data. If you exported from Google Sheets or Excel, try saving as .xlsx again or upload a CSV export.',
                    $sheetLabel,
                ),
            ],
        ]);
    }

    /**
     * @return array{lines: array<int, array<string, mixed>>, raw_row_count: int}
     */
    protected function parseWorksheetXml(string $sheetXml, array $sharedStrings): array
    {
        $sheet = simplexml_load_string($sheetXml);
        if ($sheet === false) {
            return ['lines' => [], 'raw_row_count' => 0];
        }

        $sheetRows = $this->xmlElements($sheet, 'sheetData', 'row');
        if ($sheetRows === []) {
            return ['lines' => [], 'raw_row_count' => 0];
        }

        $rows = [];
        foreach ($sheetRows as $row) {
            $cells = $this->parseWorksheetRowCells($row, $sharedStrings);

            if ($cells !== []) {
                $rows[] = $cells;
            }
        }

        if ($rows === []) {
            return ['lines' => [], 'raw_row_count' => 0];
        }

        $headerRowIndex = $this->findHeaderRowIndex($rows);
        if ($headerRowIndex === null) {
            return [
                'lines' => [],
                'raw_row_count' => count($sheetRows),
            ];
        }

        $headerMap = $this->buildHeaderMap($rows[$headerRowIndex]);
        $lines = [];
        $rowNumber = $headerRowIndex + 2;
        foreach (array_slice($rows, $headerRowIndex + 1) as $row) {
            $data = $this->rowValuesFromColumnMap($row, $headerMap);
            $parsed = $this->mapRowToRawLine($data, $rowNumber);
            if ($parsed !== null) {
                $lines[] = $parsed;
            }

            $rowNumber++;
        }

        return [
            'lines' => $lines,
            'raw_row_count' => count($sheetRows),
        ];
    }

    /**
     * @param  array<int, string>  $sharedStrings
     */
    protected function extractCellValue(\SimpleXMLElement $cell, array $sharedStrings): string
    {
        $type = (string) ($cell['t'] ?? '');
        $valueNodes = $this->xmlElements($cell, null, 'v');
        $value = $valueNodes !== [] ? (string) $valueNodes[0] : '';

        if ($type === 's') {
            $index = (int) $value;

            return $sharedStrings[$index] ?? '';
        }

        if ($type === 'inlineStr' || $type === 'str') {
            return $this->extractInlineString($cell);
        }

        if ($value !== '') {
            return $value;
        }

        return $this->extractInlineString($cell);
    }

    protected function extractInlineString(\SimpleXMLElement $cell): string
    {
        $inlineStringNodes = $this->xmlElements($cell, 'is');
        if ($inlineStringNodes === []) {
            return '';
        }

        $inlineString = $inlineStringNodes[0];
        $textNodes = $this->xmlElements($inlineString, null, 't');
        if ($textNodes !== []) {
            return (string) $textNodes[0];
        }

        $text = '';
        foreach ($this->xmlElements($inlineString, null, 'r') as $run) {
            foreach ($this->xmlElements($run, null, 't') as $runText) {
                $text .= (string) $runText;
            }
        }

        return $text;
    }

    /**
     * @return array<int, \SimpleXMLElement>
     */
    protected function xmlElements(\SimpleXMLElement $node, ?string $parentLocalName, ?string $childLocalName = null): array
    {
        if ($childLocalName === null) {
            $childLocalName = (string) $parentLocalName;
            $parentLocalName = null;
        }

        $xpath = $parentLocalName === null
            ? './/*[local-name()="'.$childLocalName.'"]'
            : './/*[local-name()="'.$parentLocalName.'"]/*[local-name()="'.$childLocalName.'"]';

        $matches = $node->xpath($xpath);

        return is_array($matches) ? $matches : [];
    }

    /**
     * @return array<int, array{path: string, name: string}>
     */
    protected function resolveWorksheets(\ZipArchive $zip): array
    {
        $workbookXml = $zip->getFromName('xl/workbook.xml');
        $relsXml = $zip->getFromName('xl/_rels/workbook.xml.rels');

        if ($workbookXml !== false && $relsXml !== false) {
            $workbook = simplexml_load_string($workbookXml);
            $rels = simplexml_load_string($relsXml);

            if ($workbook !== false && $rels !== false) {
                $relationshipTargets = [];
                foreach ($this->xmlElements($rels, null, 'Relationship') as $relationship) {
                    $relationshipId = (string) ($relationship['Id'] ?? '');
                    $target = (string) ($relationship['Target'] ?? '');

                    if ($relationshipId === '' || $target === '') {
                        continue;
                    }

                    $relationshipTargets[$relationshipId] = $this->normalizeZipEntryPath('xl', $target);
                }

                $relationshipNamespace = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
                $worksheets = [];
                foreach ($this->xmlElements($workbook, 'sheets', 'sheet') as $sheetNode) {
                    $relationshipId = (string) ($sheetNode->attributes($relationshipNamespace)['id'] ?? '');
                    $worksheetPath = $relationshipTargets[$relationshipId] ?? null;
                    $sheetName = trim((string) ($sheetNode['name'] ?? ''));

                    if ($worksheetPath === null || $zip->locateName($worksheetPath) === false) {
                        continue;
                    }

                    $worksheets[] = [
                        'path' => $worksheetPath,
                        'name' => $sheetName !== '' ? $sheetName : basename($worksheetPath),
                    ];
                }

                if ($worksheets !== []) {
                    return $worksheets;
                }
            }
        }

        $worksheetPaths = [];
        for ($index = 0; $index < $zip->numFiles; $index++) {
            $entryName = (string) $zip->getNameIndex($index);
            if (preg_match('#^xl/worksheets/sheet\d+\.xml$#', $entryName) === 1) {
                $worksheetPaths[] = $entryName;
            }
        }

        natsort($worksheetPaths);

        return array_map(
            fn (string $worksheetPath): array => [
                'path' => $worksheetPath,
                'name' => basename($worksheetPath, '.xml'),
            ],
            array_values($worksheetPaths),
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function parseXlsxFallbackAsCsv(string $path, string $reason): array
    {
        $csvLines = $this->tryParseSpreadsheetAsCsv($path);
        if ($csvLines !== []) {
            return $csvLines;
        }

        throw ValidationException::withMessages([
            'file' => [$reason],
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function tryParseSpreadsheetAsCsv(string $path): array
    {
        $sample = file_get_contents($path, false, null, 0, 4096);
        if (! is_string($sample) || $sample === '' || str_contains($sample, "\0")) {
            return [];
        }

        return $this->parseCsv($path);
    }

    /**
     * @return array<int, string>
     */
    protected function parseSharedStrings(string|false $sharedStringsXml): array
    {
        if ($sharedStringsXml === false) {
            return [];
        }

        $shared = simplexml_load_string($sharedStringsXml);
        if ($shared === false) {
            return [];
        }

        $sharedStrings = [];
        foreach ($this->xmlElements($shared, null, 'si') as $item) {
            $textNodes = $this->xmlElements($item, null, 't');
            if ($textNodes !== []) {
                $sharedStrings[] = (string) $textNodes[0];

                continue;
            }

            $text = '';
            foreach ($this->xmlElements($item, null, 'r') as $run) {
                foreach ($this->xmlElements($run, null, 't') as $runText) {
                    $text .= (string) $runText;
                }
            }

            $sharedStrings[] = $text;
        }

        return $sharedStrings;
    }


    protected function normalizeZipEntryPath(string $basePath, string $target): string
    {
        $normalized = str_replace('\\', '/', $target);
        $segments = explode('/', trim($basePath.'/'.$normalized, '/'));
        $resolved = [];

        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                array_pop($resolved);

                continue;
            }

            $resolved[] = $segment;
        }

        return implode('/', $resolved);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    protected function mapRowToRawLine(array $data, int $rowNumber): ?array
    {
        $fields = $this->resolveCanonicalFields($data);
        $materialName = trim((string) ($fields['material_name'] ?? ''));
        $quantity = $this->parseQuantity($fields['quantity'] ?? null);

        if ($materialName === '' || $quantity <= 0) {
            return null;
        }

        $measurement = $fields['measurement_mm'] ?? null;

        return [
            'row_number' => $rowNumber,
            'line_type' => $fields['line_type'] ?? 'accessory',
            'material_code' => $this->normalizeMaterialCode($fields['material_code'] ?? null),
            'material_name' => $materialName,
            'quantity' => $quantity,
            'measurement_mm' => $measurement !== null && $measurement !== '' ? (int) $measurement : null,
            'notes' => isset($fields['notes']) ? trim((string) $fields['notes']) : null,
        ];
    }

    /**
     * @param  array<int, string>  $sharedStrings
     * @return array<string, string>
     */
    protected function parseWorksheetRowCells(\SimpleXMLElement $row, array $sharedStrings): array
    {
        $cells = [];
        $nextColumnIndex = 0;

        foreach ($this->xmlElements($row, null, 'c') as $cell) {
            $ref = (string) ($cell['r'] ?? '');
            if ($ref !== '' && preg_match('/([A-Z]+)/', $ref, $matches) === 1) {
                $column = $matches[1];
                $nextColumnIndex = $this->columnIndexFromLetters($column) + 1;
            } else {
                $column = $this->columnLettersFromIndex($nextColumnIndex);
                $nextColumnIndex++;
            }

            $cells[$column] = $this->extractCellValue($cell, $sharedStrings);
        }

        return $cells;
    }

    /**
     * @param  array<int, array<string, string>>  $rows
     */
    protected function findHeaderRowIndex(array $rows): ?int
    {
        $scanLimit = min(5, count($rows));

        for ($index = 0; $index < $scanLimit; $index++) {
            $headerMap = $this->buildHeaderMap($rows[$index]);
            if (isset($headerMap['material_name'], $headerMap['quantity'])) {
                return $index;
            }
        }

        return null;
    }

    /**
     * @param  array<string, string>  $headerRow
     * @return array<string, string>
     */
    protected function buildHeaderMap(array $headerRow): array
    {
        $headerMap = [];

        foreach ($headerRow as $column => $headerValue) {
            $canonicalField = $this->canonicalFieldForHeader($headerValue);
            if ($canonicalField !== null) {
                $headerMap[$canonicalField] = $column;
            }
        }

        return $headerMap;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @return array<string, string>
     */
    protected function buildHeaderMapFromIndexedCells(array $cells): array
    {
        $headerMap = [];

        foreach ($cells as $index => $headerValue) {
            $canonicalField = $this->canonicalFieldForHeader((string) $headerValue);
            if ($canonicalField !== null) {
                $headerMap[$canonicalField] = (string) $index;
            }
        }

        return $headerMap;
    }

    protected function canonicalFieldForHeader(string $headerValue): ?string
    {
        $normalizedHeader = $this->normalizeHeaderKey($headerValue);
        if ($normalizedHeader === '') {
            return null;
        }

        foreach (self::HEADER_ALIASES as $canonicalField => $aliases) {
            if (in_array($normalizedHeader, $aliases, true)) {
                return $canonicalField;
            }
        }

        return null;
    }

    protected function normalizeHeaderKey(string $header): string
    {
        $header = strtolower(trim($header));
        $header = preg_replace('/[\x{00A0}\x{2007}\x{202F}]/u', ' ', $header) ?? $header;
        $header = preg_replace('/\s+/u', ' ', $header) ?? $header;

        return trim($header);
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, string>  $headerMap
     * @return array<string, mixed>
     */
    protected function rowValuesFromColumnMap(array $row, array $headerMap): array
    {
        $data = [];

        foreach ($headerMap as $canonicalField => $column) {
            $data[$canonicalField] = $row[$column] ?? null;
        }

        return $data;
    }

    /**
     * @param  array<int, string|null>  $cells
     * @param  array<string, string>  $headerMap
     * @return array<string, mixed>
     */
    protected function rowValuesFromIndexedCells(array $cells, array $headerMap): array
    {
        $data = [];

        foreach ($headerMap as $canonicalField => $index) {
            $data[$canonicalField] = $cells[(int) $index] ?? null;
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function resolveCanonicalFields(array $data): array
    {
        if ($this->rowUsesCanonicalKeys($data)) {
            return $data;
        }

        $fields = [];

        foreach ($data as $key => $value) {
            $canonicalField = $this->canonicalFieldForHeader((string) $key);
            if ($canonicalField !== null) {
                $fields[$canonicalField] = $value;
            }
        }

        return $fields;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function rowUsesCanonicalKeys(array $data): bool
    {
        return array_key_exists('material_name', $data) || array_key_exists('quantity', $data);
    }

    protected function parseQuantity(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $normalized = trim((string) $value);
        $normalized = str_replace([',', ' '], '', $normalized);

        return is_numeric($normalized) ? (float) $normalized : 0.0;
    }

    protected function columnIndexFromLetters(string $letters): int
    {
        $index = 0;

        foreach (str_split(strtoupper($letters)) as $letter) {
            $index = ($index * 26) + (ord($letter) - 64);
        }

        return $index - 1;
    }

    protected function columnLettersFromIndex(int $index): string
    {
        $letters = '';
        $value = $index + 1;

        while ($value > 0) {
            $remainder = ($value - 1) % 26;
            $letters = chr(65 + $remainder).$letters;
            $value = intdiv($value - 1, 26);
        }

        return $letters !== '' ? $letters : 'A';
    }
}
