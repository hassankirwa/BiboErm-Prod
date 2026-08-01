<?php

namespace App\Services\Projects;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class QuotationAccountingExcelExtractionService
{
    public function __construct(
        protected WorkbookDrawingExtractor $drawingExtractor,
    ) {}

    /**
     * @return array{
     *     project: array{name: string|null, number: string|null, order_no: string|null},
     *     project_name: string|null,
     *     project_number: string|null,
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, subtotal: float, tax: float, grand_total: float, source_filename: string|null}
     * }
     */
    public function extractFromUpload(UploadedFile $file): array
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        $extension = strtolower((string) $file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt', 'xls', 'xlsx'], true)) {
            throw ValidationException::withMessages([
                'file' => [
                    'Unsupported file extension "'.($extension !== '' ? $extension : 'unknown').'". Upload a BIBO accounting sheet as .xlsx, .xls, .csv, or .txt.',
                ],
            ]);
        }

        if (! is_readable($path) || filesize($path) === 0) {
            throw ValidationException::withMessages([
                'file' => ['The uploaded file is empty.'],
            ]);
        }

        $rows = $this->parseFile($path, $extension);

        if ($rows === []) {
            throw ValidationException::withMessages([
                'file' => ['The accounting file is empty or contains no readable rows.'],
            ]);
        }

        $payload = $this->buildExtractionPayload($rows, $file->getClientOriginalName());

        if (in_array($extension, ['xlsx', 'xls'], true)) {
            $payload = $this->attachWorkbookDrawings($payload, $path, $extension);
        }

        return $this->drawingExtractor->sanitizePayloadForJson($payload);
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{
     *     project: array{name: string|null, number: string|null, order_no: string|null},
     *     project_name: string|null,
     *     project_number: string|null,
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, subtotal: float, tax: float, grand_total: float, source_filename: string|null}
     * }
     */
    public function buildExtractionPayload(array $rows, ?string $sourceFilename = null): array
    {
        if ($this->isTabularQuotationLayout($rows)) {
            return $this->buildTabularPayload($rows, $sourceFilename);
        }

        return $this->buildCostSectionPayload($rows, $sourceFilename);
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{
     *     project: array{name: string|null, number: string|null, order_no: string|null},
     *     project_name: string|null,
     *     project_number: string|null,
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, subtotal: float, tax: float, grand_total: float, source_filename: string|null}
     * }
     */
    protected function buildTabularPayload(array $rows, ?string $sourceFilename): array
    {
        $headerIndex = $this->findTabularHeaderRowIndex($rows);
        if ($headerIndex === null) {
            throw ValidationException::withMessages([
                'file' => ['Accounting table headers were not found. Expected columns such as SERIS, CODE, and GLASS TYPE.'],
            ]);
        }

        $projectName = $this->findDocumentLabelValue($rows, ['Project Name', '项目名称'])
            ?? $this->inferProjectNameFromTitleRow($rows, $headerIndex);
        $projectNumber = $this->findDocumentLabelValue($rows, ['Project No', 'Project No.', 'Order No', '项目编号']);

        $columns = $this->mapTabularColumns($rows[$headerIndex]);
        $lines = [];

        for ($i = $headerIndex + 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            if (! $this->rowHasContent($row)) {
                continue;
            }

            $flat = strtolower(implode(' ', $row));
            if ($this->isSummaryFooterRow($flat)) {
                break;
            }

            $line = $this->parseTabularLineRow($row, $columns);
            if ($line !== null) {
                $lines[] = $line;
            }
        }

        if ($lines === []) {
            throw ValidationException::withMessages([
                'file' => ['No quotation line items could be read from the accounting table.'],
            ]);
        }

        $costSections = $this->indexCostSectionsByCode($rows);
        foreach ($lines as $index => $line) {
            $code = $line['code'] ?? null;
            if ($code !== null && isset($costSections[$code])) {
                $lines[$index] = $this->mergeLineWithCostSection($line, $costSections[$code]);
            }
        }

        $projectName ??= $this->firstNonNull(array_map(
            fn (array $section): ?string => $section['project_name'] ?? null,
            $costSections,
        ));
        $projectNumber ??= $this->firstNonNull(array_map(
            fn (array $section): ?string => $section['project_number'] ?? null,
            $costSections,
        ));

        $footer = $this->parseTabularFooterTotals($rows, $headerIndex);
        $lineSubtotal = round(array_sum(array_column($lines, 'line_total')), 2);
        $subtotal = $footer['subtotal'] ?? $lineSubtotal;
        $tax = $footer['tax'] ?? round(array_sum(array_map(
            fn (array $line): float => (float) ($line['metadata']['accounting']['vat_amount'] ?? 0),
            $lines,
        )), 2);
        $grandTotal = $footer['grand_total'] ?? round($subtotal + $tax, 2);

        return $this->formatPayload(
            $projectName,
            $projectNumber,
            $lines,
            $subtotal,
            $tax,
            $grandTotal,
            $sourceFilename,
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{
     *     project: array{name: string|null, number: string|null, order_no: string|null},
     *     project_name: string|null,
     *     project_number: string|null,
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, subtotal: float, tax: float, grand_total: float, source_filename: string|null}
     * }
     */
    protected function buildCostSectionPayload(array $rows, ?string $sourceFilename): array
    {
        $sections = $this->splitIntoSections($rows);
        $lines = [];
        $projectName = null;
        $projectNumber = null;
        $taxTotal = 0.0;

        foreach ($sections as $sectionRows) {
            $parsed = $this->parseCostSection($sectionRows);
            if ($parsed === null) {
                continue;
            }

            $dimensions = $this->scanCostSectionDimensions($sectionRows);
            if ($dimensions['width_mm'] !== null) {
                $parsed['width_mm'] = $dimensions['width_mm'];
            }
            if ($dimensions['height_mm'] !== null) {
                $parsed['height_mm'] = $dimensions['height_mm'];
            }

            $projectName ??= $parsed['project_name'] ?? null;
            $projectNumber ??= $parsed['project_number'] ?? null;
            $taxTotal += (float) ($parsed['metadata']['accounting']['vat_amount'] ?? 0);
            unset($parsed['project_name'], $parsed['project_number']);
            $lines[] = $parsed;
        }

        if ($lines === []) {
            throw ValidationException::withMessages([
                'file' => [$this->missingItemsMessage($rows)],
            ]);
        }

        $grandTotal = round(array_sum(array_column($lines, 'line_total')), 2);
        $tax = round($taxTotal, 2);
        $subtotal = round(max($grandTotal - $tax, 0), 2);

        return $this->formatPayload(
            $projectName,
            $projectNumber,
            $lines,
            $subtotal,
            $tax,
            $grandTotal,
            $sourceFilename,
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @return array{
     *     project: array{name: string|null, number: string|null, order_no: string|null},
     *     project_name: string|null,
     *     project_number: string|null,
     *     lines: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, subtotal: float, tax: float, grand_total: float, source_filename: string|null}
     * }
     */
    protected function formatPayload(
        ?string $projectName,
        ?string $projectNumber,
        array $lines,
        float $subtotal,
        float $tax,
        float $grandTotal,
        ?string $sourceFilename,
    ): array {
        return [
            'project' => [
                'name' => $projectName,
                'number' => $projectNumber,
                'order_no' => $projectNumber,
            ],
            'project_name' => $projectName,
            'project_number' => $projectNumber,
            'lines' => array_values($lines),
            'summary' => [
                'total_items' => count($lines),
                'subtotal' => $subtotal,
                'tax' => $tax,
                'grand_total' => $grandTotal,
                'source_filename' => $sourceFilename,
            ],
        ];
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function isTabularQuotationLayout(array $rows): bool
    {
        return $this->findTabularHeaderRowIndex($rows) !== null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function findTabularHeaderRowIndex(array $rows): ?int
    {
        foreach ($rows as $index => $row) {
            $columns = $this->mapTabularColumns($row);
            if (($columns['code'] ?? null) !== null && ($columns['series'] ?? null) !== null) {
                return $index;
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function inferProjectNameFromTitleRow(array $rows, int $headerIndex): ?string
    {
        for ($i = 0; $i < $headerIndex; $i++) {
            $cell = trim($rows[$i][0] ?? '');
            if ($cell === '') {
                continue;
            }

            if (preg_match('/^([A-Za-z][A-Za-z0-9 _-]*)[\s\-–—]/u', $cell, $matches)) {
                return trim($matches[1]);
            }

            if (preg_match('/^([A-Z][A-Z0-9]+)/u', $cell, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $headerRow
     * @return array<string, int|null>
     */
    protected function mapTabularColumns(array $headerRow): array
    {
        $columns = [
            'series' => null,
            'code' => null,
            'glass_type' => null,
            'width_mm' => null,
            'height_mm' => null,
            'sqm_per_pcs' => null,
            'quantity' => null,
            'total_sqm' => null,
            'usd_per_sqm' => null,
            'unit_price' => null,
            'line_total' => null,
            'material_cost_usd' => null,
            'glass_cost_usd' => null,
            'hardware_cost_usd' => null,
        ];

        foreach ($headerRow as $index => $cell) {
            $normalized = strtolower(preg_replace('/\s+/', ' ', trim(str_replace("\n", ' ', $cell))) ?? '');
            if ($normalized === '') {
                continue;
            }

            if ($columns['series'] === null && $this->matchesColumn($normalized, ['seris', 'series', 'seri'])) {
                $columns['series'] = $index;
            }

            if ($columns['code'] === null && $this->matchesColumn($normalized, ['code', 'w&d code'])) {
                $columns['code'] = $index;
            }

            if (
                $columns['glass_type'] === null
                && (
                    str_contains($normalized, 'glass type')
                    || $normalized === 'glazing'
                    || ($normalized === 'glass' && ! str_contains($normalized, 'cost'))
                )
            ) {
                $columns['glass_type'] = $index;
            }

            if ($columns['width_mm'] === null && $this->matchesColumn($normalized, ['width (mm)', 'width mm', 'width'])) {
                $columns['width_mm'] = $index;
            }

            if ($columns['height_mm'] === null && $this->matchesColumn($normalized, ['height (mm)', 'height mm', 'height'])) {
                $columns['height_mm'] = $index;
            }

            if (
                $columns['sqm_per_pcs'] === null
                && (
                    str_contains($normalized, 'sqm/pcs')
                    || str_contains($normalized, 'sqm per pcs')
                )
            ) {
                $columns['sqm_per_pcs'] = $index;
            }

            if (
                $columns['quantity'] === null
                && (
                    preg_match('/\bqty\b/u', $normalized) === 1
                    || str_contains($normalized, 'quantity')
                )
                && ! str_contains($normalized, 'sqm')
            ) {
                $columns['quantity'] = $index;
            }

            if ($columns['total_sqm'] === null && str_contains($normalized, 'total sqm')) {
                $columns['total_sqm'] = $index;
            }

            if (
                $columns['material_cost_usd'] === null
                && str_contains($normalized, 'material cost')
            ) {
                $columns['material_cost_usd'] = $index;
            }

            if (
                $columns['glass_cost_usd'] === null
                && str_contains($normalized, 'glass cost')
            ) {
                $columns['glass_cost_usd'] = $index;
            }

            if (
                $columns['hardware_cost_usd'] === null
                && str_contains($normalized, 'hardware cost')
            ) {
                $columns['hardware_cost_usd'] = $index;
            }

            if (
                $columns['usd_per_sqm'] === null
                && (
                    str_contains($normalized, 'usd/sqm')
                    || (str_contains($normalized, 'price') && str_contains($normalized, 'sqm') && ! str_contains($normalized, 'pcs'))
                )
            ) {
                $columns['usd_per_sqm'] = $index;
            }

            if (
                $columns['unit_price'] === null
                && str_contains($normalized, 'price')
                && (
                    str_contains($normalized, '/pcs')
                    || str_contains($normalized, 'kes/pcs')
                    || str_contains($normalized, 'unit price')
                )
                && ! str_contains($normalized, 'total price')
                && ! str_contains($normalized, 'sqm')
            ) {
                $columns['unit_price'] = $index;
            }

            if (
                $columns['line_total'] === null
                && (
                    str_contains($normalized, 'total price')
                    || str_contains($normalized, 'line total')
                    || $normalized === 'amount'
                )
            ) {
                $columns['line_total'] = $index;
            }
        }

        return $columns;
    }

    /**
     * @param  array<int, string>  $aliases
     */
    protected function matchesColumn(string $normalized, array $aliases): bool
    {
        foreach ($aliases as $alias) {
            if ($normalized === $alias || str_contains($normalized, $alias)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, string>  $row
     * @param  array<string, int|null>  $columns
     * @return array<string, mixed>|null
     */
    protected function parseTabularLineRow(array $row, array $columns): ?array
    {
        $series = $this->cellAt($row, $columns['series']);
        $code = $this->cellAt($row, $columns['code']);

        if (($code === null || $code === '') && ($series === null || $series === '')) {
            return null;
        }

        if ($code !== null && preg_match('/^(total|合计|subtotal|grand)/iu', $code)) {
            return null;
        }

        $quantity = $this->parseLineQuantity($this->cellAt($row, $columns['quantity']));
        $sqmPerPcs = $this->nullableFloat($this->cellAt($row, $columns['sqm_per_pcs']));
        $totalSqm = $this->nullableFloat($this->cellAt($row, $columns['total_sqm']));
        $usdPerSqm = $this->parseMoney($this->cellAt($row, $columns['usd_per_sqm']));
        $unitPrice = $this->parseMoney($this->cellAt($row, $columns['unit_price']));
        $lineTotal = $this->parseMoney($this->cellAt($row, $columns['line_total']));

        if ($lineTotal === null || $lineTotal <= 0) {
            $lineTotal = $unitPrice !== null && $unitPrice > 0
                ? round($quantity * $unitPrice, 2)
                : null;
        }

        if ($lineTotal === null || $lineTotal <= 0) {
            return null;
        }

        if ($totalSqm === null && $sqmPerPcs !== null) {
            $totalSqm = round($sqmPerPcs * $quantity, 4);
        }

        if ($sqmPerPcs === null && $totalSqm !== null && $quantity > 0) {
            $sqmPerPcs = round($totalSqm / $quantity, 4);
        }

        if ($unitPrice === null || $unitPrice <= 0) {
            $unitPrice = round($lineTotal / max($quantity, 1), 2);
        }

        $glassType = $this->cellAt($row, $columns['glass_type']);
        if ($this->looksLikeNumericGlassType($glassType)) {
            $glassType = null;
        }

        $currency = $this->detectTabularCurrency($columns);
        $description = trim(implode(' — ', array_filter([$series, $code, $glassType])));

        return [
            'series' => $series,
            'code' => $code,
            'glass_type' => $glassType,
            'width_mm' => $this->nullableFloat($this->cellAt($row, $columns['width_mm'])),
            'height_mm' => $this->nullableFloat($this->cellAt($row, $columns['height_mm'])),
            'sqm_per_pcs' => $sqmPerPcs,
            'quantity' => $quantity,
            'total_sqm' => $totalSqm,
            'unit_price' => round($unitPrice, 2),
            'line_total' => round($lineTotal, 2),
            'description' => $description !== '' ? $description : ($code ?? 'Line item'),
            'metadata' => [
                'accounting' => array_filter([
                    'layout' => 'tabular',
                    'currency' => $currency,
                    'usd_per_sqm' => $usdPerSqm,
                    'line_total_usd' => $currency === 'USD' ? round($lineTotal, 2) : null,
                    'unit_price_usd' => $currency === 'USD' ? round($unitPrice, 2) : null,
                    'material_cost_usd' => $this->parseMoney($this->cellAt($row, $columns['material_cost_usd'])),
                    'glass_cost_usd' => $this->parseMoney($this->cellAt($row, $columns['glass_cost_usd'])),
                    'hardware_cost_usd' => $this->parseMoney($this->cellAt($row, $columns['hardware_cost_usd'])),
                ], fn (mixed $value): bool => $value !== null && $value !== ''),
            ],
        ];
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{subtotal: float|null, tax: float|null, grand_total: float|null}
     */
    protected function parseTabularFooterTotals(array $rows, int $headerIndex): array
    {
        $totals = [
            'subtotal' => null,
            'tax' => null,
            'grand_total' => null,
        ];

        for ($i = $headerIndex + 1; $i < count($rows); $i++) {
            $row = $rows[$i];
            $flat = strtolower(implode(' ', $row));

            if (! $this->isSummaryFooterRow($flat)) {
                continue;
            }

            $amount = $this->lastMoneyInRow($row);
            if ($amount === null) {
                continue;
            }

            if (str_contains($flat, 'grand total') || str_contains($flat, 'total amount')) {
                $totals['grand_total'] = $amount;
            } elseif (str_contains($flat, 'vat') || str_contains($flat, 'tax')) {
                $totals['tax'] = ($totals['tax'] ?? 0) + $amount;
            } elseif (str_contains($flat, 'subtotal') || str_contains($flat, '合计') || str_contains($flat, 'total')) {
                $totals['subtotal'] = $amount;
            }
        }

        return $totals;
    }

    protected function isSummaryFooterRow(string $flat): bool
    {
        return str_contains($flat, 'total')
            || str_contains($flat, 'subtotal')
            || str_contains($flat, 'vat')
            || str_contains($flat, 'tax')
            || str_contains($flat, '合计');
    }

    /**
     * @param  array<int, string>  $labels
     * @param  array<int, array<int, string>>  $rows
     */
    protected function findDocumentLabelValue(array $rows, array $labels): ?string
    {
        foreach ($labels as $label) {
            $value = $this->findLabelValue($rows, $label);
            if ($value !== null && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<int, array<int, string>>
     */
    protected function splitIntoSections(array $rows): array
    {
        $sections = [];
        $current = [];

        foreach ($rows as $row) {
            $flat = implode("\t", $row);
            if (preg_match('/-W&D Cost-/u', $flat)) {
                if ($current !== []) {
                    $sections[] = $current;
                }
                $current = [$row];

                continue;
            }

            if ($current !== []) {
                $current[] = $row;
            }
        }

        if ($current !== []) {
            $sections[] = $current;
        }

        return $sections;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<string, mixed>|null
     */
    protected function parseCostSection(array $rows): ?array
    {
        $header = $this->parseSectionHeader($rows);
        if ($header === null) {
            return null;
        }

        $series = $this->findLabelValue($rows, 'SERIS') ?? $this->findLabelValue($rows, 'SERIES');
        $code = $this->findLabelValue($rows, 'CODE') ?? $header['code'];
        $quantity = max((float) ($this->findLabelValue($rows, 'QTY') ?? 1), 1);
        $sqmPerPcs = (float) ($this->findLabelValue($rows, 'SQM') ?? 0);
        $totalSqm = (float) ($this->findLabelValue($rows, 'TOTAL SQM') ?? ($sqmPerPcs * $quantity));
        $inColour = $this->findLabelValue($rows, 'IN COLOUR');
        $outColour = $this->findLabelValue($rows, 'OUT COLOUR');
        $location = $this->findLabelValue($rows, 'LOCATION');
        $mark = $this->findLabelValue($rows, 'MARK');
        $price = $this->parseMoney($this->findLabelValue($rows, 'PRICE'));
        $usdPerSqm = $this->parseUsdPerSqm($rows);
        $lineTotal = $this->parseFinalTotalCost($rows) ?? $price;
        $glassType = $this->extractGlassType($rows);
        $vatAmount = $this->parseSectionVat($rows);
        $costBreakdown = $this->parseCostBreakdown($rows);

        if ($lineTotal === null || $lineTotal <= 0) {
            $lineTotal = $price ?? 0.0;
        }

        if ($lineTotal <= 0) {
            return null;
        }

        $unitPrice = $quantity > 0 ? round($lineTotal / $quantity, 2) : $lineTotal;
        $description = trim(implode(' — ', array_filter([$series, $code, $glassType])));

        return [
            'project_name' => $header['project_name'],
            'project_number' => $header['project_number'],
            'description' => $description !== '' ? $description : ($code ?? 'Line item'),
            'series' => $series,
            'code' => $code,
            'glass_type' => $glassType,
            'width_mm' => null,
            'height_mm' => null,
            'sqm_per_pcs' => $sqmPerPcs > 0 ? round($sqmPerPcs, 4) : null,
            'total_sqm' => $totalSqm > 0 ? round($totalSqm, 4) : null,
            'quantity' => $this->parseLineQuantity((string) $quantity),
            'unit_price' => $unitPrice,
            'line_total' => round($lineTotal, 2),
            'metadata' => [
                'accounting' => array_filter([
                    'layout' => 'cost_section',
                    'currency' => 'USD',
                    'usd_per_sqm' => $usdPerSqm,
                    'line_total_usd' => round($lineTotal, 2),
                    'unit_price_usd' => $unitPrice,
                    'in_colour' => $inColour,
                    'out_colour' => $outColour,
                    'location' => $location,
                    'mark' => $mark,
                    'source_price' => $price,
                    'vat_amount' => $vatAmount,
                    'commission_amount' => $costBreakdown['commission'] ?? null,
                    'profit_amount' => $costBreakdown['profit'] ?? null,
                    'cost_breakdown' => $costBreakdown,
                ], fn (mixed $value): bool => $value !== null && $value !== ''),
            ],
        ];
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<string, array<string, mixed>>
     */
    protected function indexCostSectionsByCode(array $rows): array
    {
        $indexed = [];

        foreach ($this->splitIntoSections($rows) as $sectionRows) {
            $parsed = $this->parseCostSection($sectionRows);
            if ($parsed === null) {
                continue;
            }

            $code = $parsed['code'] ?? null;
            if ($code === null || $code === '') {
                continue;
            }

            $indexed[$code] = $parsed;
        }

        return $indexed;
    }

    /**
     * @param  array<string, mixed>  $line
     * @param  array<string, mixed>  $costSection
     * @return array<string, mixed>
     */
    protected function mergeLineWithCostSection(array $line, array $costSection): array
    {
        $costAccounting = $costSection['metadata']['accounting'] ?? [];
        $lineAccounting = $line['metadata']['accounting'] ?? [];
        $glassType = $line['glass_type'] ?? null;

        if ($glassType === null || $this->looksLikeNumericGlassType($glassType)) {
            $glassType = $costSection['glass_type'] ?? $glassType;
        }

        $mergedAccounting = array_merge($lineAccounting, array_filter([
            'usd_per_sqm' => $lineAccounting['usd_per_sqm'] ?? $costAccounting['usd_per_sqm'] ?? null,
            'in_colour' => $costAccounting['in_colour'] ?? null,
            'out_colour' => $costAccounting['out_colour'] ?? null,
            'location' => $costAccounting['location'] ?? null,
            'mark' => $costAccounting['mark'] ?? null,
            'source_price' => $costAccounting['source_price'] ?? null,
            'vat_amount' => $costAccounting['vat_amount'] ?? null,
            'commission_amount' => $costAccounting['commission_amount'] ?? null,
            'profit_amount' => $costAccounting['profit_amount'] ?? null,
            'cost_breakdown' => $costAccounting['cost_breakdown'] ?? null,
        ], fn (mixed $value): bool => $value !== null && $value !== ''));

        $mergedAccounting['layout'] = 'tabular';

        $description = trim(implode(' — ', array_filter([
            $line['series'] ?? null,
            $line['code'] ?? null,
            $glassType,
        ])));

        return array_merge($line, [
            'glass_type' => $glassType,
            'description' => $description !== '' ? $description : ($line['description'] ?? 'Line item'),
            'metadata' => [
                'accounting' => $mergedAccounting,
            ],
        ]);
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<string, mixed>
     */
    protected function parseCostBreakdown(array $rows): array
    {
        $breakdown = [
            'direct_cost' => [
                'aluminum_profile' => ['items' => [], 'subtotal' => null],
                'glass_mesh' => ['items' => [], 'subtotal' => null],
                'hardware' => ['items' => [], 'subtotal' => null],
                'materials_total' => null,
                'labor' => ['items' => [], 'subtotal' => null],
                'subtotal' => null,
            ],
            'indirect_cost' => ['items' => [], 'subtotal' => null],
            'profit' => null,
            'vat' => null,
            'commission' => null,
            'total_cost' => null,
        ];

        $currentSection = null;
        $inItemTable = false;

        foreach ($rows as $row) {
            $flat = trim(implode(' ', $row));
            $label = trim((string) ($row[0] ?? ''));

            if (str_contains($flat, 'Aluminum Profile Cost')) {
                $currentSection = 'aluminum';
                $inItemTable = false;

                continue;
            }

            if (str_contains($flat, 'Glass') && str_contains($flat, 'Mesh Cost')) {
                $currentSection = 'glass';
                $inItemTable = false;

                continue;
            }

            if (str_contains($flat, 'Hardware Cost')) {
                $currentSection = 'hardware';
                $inItemTable = false;

                continue;
            }

            if (str_contains($flat, 'LABOR COST')) {
                $currentSection = 'labor';
                $inItemTable = false;

                continue;
            }

            if (str_contains($flat, 'INDIRECT COST')) {
                $currentSection = 'indirect';
                $inItemTable = false;

                continue;
            }

            if (preg_match('/^1\.Total Cost\b/iu', $flat)) {
                $breakdown['direct_cost']['aluminum_profile']['subtotal'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/^2\.Total Cost\b/iu', $flat)) {
                $breakdown['direct_cost']['glass_mesh']['subtotal'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/^3\.Total Cost\b/iu', $flat)) {
                $breakdown['direct_cost']['hardware']['subtotal'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/^4\.Total Cost\b/iu', $flat)) {
                $breakdown['direct_cost']['labor']['subtotal'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (str_contains($flat, 'Materials Total Cost')) {
                $breakdown['direct_cost']['materials_total'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (str_contains($flat, 'DIRECT COST TOTAL')) {
                $breakdown['direct_cost']['subtotal'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/\bProfit\b/iu', $flat)) {
                $breakdown['profit'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/\bVAT\b/iu', $flat)) {
                $breakdown['vat'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/\bCommission\b/iu', $flat)) {
                $breakdown['commission'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (preg_match('/^Total Cost\b/iu', $flat)) {
                $breakdown['total_cost'] = $this->lastMoneyInRow($row);

                continue;
            }

            if (str_contains($flat, 'Name') && str_contains($flat, 'Specification')) {
                $inItemTable = true;

                continue;
            }

            if ($currentSection === 'indirect' && $label !== '' && ! str_contains($label, 'INDIRECT')) {
                $breakdown['indirect_cost']['items'][] = [
                    'name' => $label,
                    'note' => trim((string) ($row[1] ?? '')),
                    'total_price' => $this->lastMoneyInRow($row),
                ];

                continue;
            }

            if (! $inItemTable || $label === '' || str_contains($label, 'Name')) {
                continue;
            }

            if ($currentSection === 'aluminum') {
                $breakdown['direct_cost']['aluminum_profile']['items'][] = [
                    'name' => $label,
                    'specification' => trim((string) ($row[1] ?? '')),
                    'weight' => $this->parseMoney($row[2] ?? null),
                    'unit' => trim((string) ($row[3] ?? '')),
                    'unit_price' => $this->parseMoney($row[4] ?? null),
                    'total_price' => $this->parseMoney($row[5] ?? null),
                ];

                continue;
            }

            if ($currentSection === 'glass') {
                $breakdown['direct_cost']['glass_mesh']['items'][] = [
                    'name' => $label,
                    'specification' => trim((string) ($row[1] ?? '')),
                    'qty' => $this->parseMoney($row[2] ?? null),
                    'unit' => trim((string) ($row[3] ?? '')),
                    'unit_price' => $this->parseMoney($row[4] ?? null),
                    'total_price' => $this->parseMoney($row[5] ?? null),
                ];

                continue;
            }

            if ($currentSection === 'hardware') {
                $breakdown['direct_cost']['hardware']['items'][] = [
                    'name' => $label,
                    'specification' => trim((string) ($row[1] ?? '')),
                    'qty' => $this->parseMoney($row[2] ?? null),
                    'unit' => trim((string) ($row[3] ?? '')),
                    'unit_price' => $this->parseMoney($row[4] ?? null),
                    'total_price' => $this->parseMoney($row[5] ?? null),
                ];

                continue;
            }

            if ($currentSection === 'labor') {
                $breakdown['direct_cost']['labor']['items'][] = [
                    'name' => $label,
                    'qty' => $this->parseMoney($row[2] ?? null),
                    'unit' => trim((string) ($row[3] ?? '')),
                    'unit_price' => $this->parseMoney($row[4] ?? null),
                    'total_price' => $this->parseMoney($row[5] ?? null),
                ];
            }
        }

        if ($breakdown['indirect_cost']['items'] !== []) {
            $breakdown['indirect_cost']['subtotal'] = round(array_sum(array_filter(array_map(
                fn (array $item): float => (float) ($item['total_price'] ?? 0),
                $breakdown['indirect_cost']['items'],
            ))), 4);
        }

        return $breakdown;
    }

    protected function parseLineQuantity(?string $value): float
    {
        if ($value === null || trim($value) === '') {
            return 1.0;
        }

        $parsed = (float) $value;
        if ($parsed <= 0) {
            return 1.0;
        }

        if (abs($parsed - round($parsed)) < 0.0001) {
            return (float) (int) round($parsed);
        }

        return $parsed;
    }

    protected function looksLikeNumericGlassType(?string $value): bool
    {
        if ($value === null || trim($value) === '') {
            return false;
        }

        return is_numeric(str_replace(',', '', trim($value)));
    }

    /**
     * @param  array<string, int|null>  $columns
     */
    protected function detectTabularCurrency(array $columns): string
    {
        foreach (['unit_price', 'line_total'] as $key) {
            $index = $columns[$key] ?? null;
            if ($index === null) {
                continue;
            }
        }

        return ($columns['material_cost_usd'] ?? null) !== null ? 'USD' : 'KES';
    }

    /**
     * @param  array<int, string|null>  $values
     */
    protected function firstNonNull(array $values): ?string
    {
        foreach ($values as $value) {
            if ($value !== null && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{project_name: string|null, project_number: string|null, code: string|null}|null
     */
    protected function parseSectionHeader(array $rows): ?array
    {
        foreach ($rows as $row) {
            foreach ($row as $cell) {
                if (! preg_match('/^(?P<project>.+?)-W&D Cost-(?P<code>.+)$/u', trim($cell), $matches)) {
                    continue;
                }

                return [
                    'project_name' => trim($matches['project']) ?: null,
                    'project_number' => null,
                    'code' => trim($matches['code']) ?: null,
                ];
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function parseUsdPerSqm(array $rows): ?float
    {
        foreach ($rows as $row) {
            $flat = implode(' ', $row);
            if (! str_contains($flat, 'USD/SQM')) {
                continue;
            }

            foreach ($row as $cell) {
                $value = $this->parseMoney($cell);
                if ($value !== null && $value > 0) {
                    return $value;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function parseFinalTotalCost(array $rows): ?float
    {
        $final = null;

        foreach ($rows as $row) {
            $flat = trim(implode(' ', $row));
            if (! preg_match('/^Total Cost\b/iu', $flat)) {
                continue;
            }

            $value = $this->lastMoneyInRow($row);
            if ($value !== null && $value > 0) {
                $final = $value;
            }
        }

        return $final;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function parseSectionVat(array $rows): ?float
    {
        foreach ($rows as $row) {
            $flat = implode(' ', $row);
            if (! preg_match('/\bVAT\b/iu', $flat)) {
                continue;
            }

            $value = $this->lastMoneyInRow($row);
            if ($value !== null && $value > 0) {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $row
     */
    protected function lastMoneyInRow(array $row): ?float
    {
        for ($i = count($row) - 1; $i >= 0; $i--) {
            $value = $this->parseMoney($row[$i]);
            if ($value !== null && $value > 0) {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function extractGlassType(array $rows): ?string
    {
        $inGlassSection = false;

        foreach ($rows as $row) {
            $flat = implode(' ', $row);

            if (str_contains($flat, 'Glass') && str_contains($flat, 'Mesh Cost')) {
                $inGlassSection = true;

                continue;
            }

            if ($inGlassSection) {
                if (str_contains($flat, 'Total Cost') || str_contains($flat, 'Hardware Cost')) {
                    break;
                }

                $name = trim((string) ($row[0] ?? ''));
                if ($name !== '' && ! str_contains($name, 'Name')) {
                    return $this->normalizeGlassType($name);
                }
            }
        }

        return null;
    }

    protected function normalizeGlassType(string $raw): string
    {
        $normalized = trim($raw);
        if (preg_match('/(\d+)\s*mm.*brown/i', $normalized, $matches)) {
            return 'Bronze Reflective glass '.$matches[1].'mm';
        }
        if (preg_match('/(\d+)\s*mm/i', $normalized, $matches)) {
            return 'Reflective glass '.$matches[1].'mm';
        }

        return $normalized;
    }

    protected function parseMoney(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $normalized = str_replace([',', ' '], '', trim($value));
        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return (float) $normalized;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function findLabelValue(array $rows, string $label): ?string
    {
        foreach ($rows as $row) {
            foreach ($row as $index => $cell) {
                $normalized = $this->normalizeLabel($cell);
                if (! str_starts_with($normalized, $this->normalizeLabel($label))) {
                    continue;
                }

                $inline = trim(preg_replace('/^'.preg_quote($label, '/').'[：:\s]*/u', '', $cell) ?? '');
                if (
                    $inline !== ''
                    && $inline !== $cell
                    && ! $this->looksLikeLabel($inline)
                    && ! $this->isPunctuationOnly($inline)
                ) {
                    return $inline;
                }

                for ($i = $index + 1; $i < count($row); $i++) {
                    $candidate = trim($row[$i]);
                    if ($candidate !== '' && ! $this->looksLikeLabel($candidate)) {
                        return $candidate;
                    }
                }
            }
        }

        return null;
    }

    protected function looksLikeLabel(string $value): bool
    {
        $normalized = $this->normalizeLabel($value);

        return str_ends_with($normalized, 'PRICE')
            || str_ends_with($normalized, 'MARK')
            || str_ends_with($normalized, 'COLOUR')
            || str_ends_with($normalized, 'LOCATION');
    }

    protected function isPunctuationOnly(string $value): bool
    {
        return preg_match('/^[\s.:：\-]+$/u', $value) === 1;
    }

    protected function normalizeLabel(string $value): string
    {
        return trim(str_replace(['：', ':'], '', $value));
    }

    /**
     * @param  array<int, string>  $row
     */
    protected function cellAt(array $row, ?int $index): ?string
    {
        if ($index === null) {
            return null;
        }

        $value = trim((string) ($row[$index] ?? ''));

        return $value === '' ? null : $value;
    }

    protected function nullableFloat(?string $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    /**
     * @return array<int, array<int, string>>
     */
    public function parseFile(string $path, string $extension): array
    {
        return match ($extension) {
            'csv', 'txt' => $this->parseDelimited($path),
            'xls', 'xlsx' => $this->parseSpreadsheet($path, $extension),
            default => throw ValidationException::withMessages([
                'file' => ['Unsupported accounting file format. Use .xlsx, .xls, .csv, or .txt.'],
            ]),
        };
    }

    /**
     * @return array<int, array<int, string>>
     */
    protected function parseDelimited(string $path): array
    {
        $content = file_get_contents($path);
        if (! is_string($content) || trim($content) === '') {
            return [];
        }

        $delimiter = str_contains($content, "\t") ? "\t" : ',';
        $rows = [];
        foreach (preg_split('/\r\n|\r|\n/', $content) ?: [] as $line) {
            if (trim($line) === '') {
                continue;
            }
            $rows[] = array_map('trim', str_getcsv($line, $delimiter));
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    protected function parseSpreadsheet(string $path, string $extension): array
    {
        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);

            return $this->spreadsheetToRows($spreadsheet);
        } catch (\Throwable $exception) {
            if ($extension === 'xls') {
                $fallbackRows = $this->parseLegacyXlsWithSimpleXls($path);
                if ($fallbackRows !== []) {
                    return $fallbackRows;
                }
            }

            if ($extension === 'xlsx') {
                $fallbackRows = $this->parseXlsxWithSimpleXlsx($path);
                if ($fallbackRows !== []) {
                    return $fallbackRows;
                }
            }

            throw ValidationException::withMessages([
                'file' => [sprintf(
                    'Unable to read the uploaded %s accounting workbook.',
                    $extension === 'xls' ? '.xls' : '.xlsx',
                )],
            ]);
        }
    }

    /**
     * @return array<int, array<int, string>>
     */
    protected function parseLegacyXlsWithSimpleXls(string $path): array
    {
        if (! class_exists(\Shuchkin\SimpleXLS::class)) {
            return [];
        }

        $workbook = \Shuchkin\SimpleXLS::parse($path);
        if ($workbook === false) {
            return [];
        }

        return $this->rowsFromSimpleWorkbook($workbook->rows());
    }

    /**
     * @return array<int, array<int, string>>
     */
    protected function parseXlsxWithSimpleXlsx(string $path): array
    {
        if (! class_exists(\Shuchkin\SimpleXLSX::class)) {
            return [];
        }

        $workbook = \Shuchkin\SimpleXLSX::parse($path);
        if ($workbook === false) {
            return [];
        }

        return $this->rowsFromSimpleWorkbook($workbook->rows());
    }

    /**
     * @param  iterable<int, mixed>  $workbookRows
     * @return array<int, array<int, string>>
     */
    protected function rowsFromSimpleWorkbook(iterable $workbookRows): array
    {
        $rows = [];

        foreach ($workbookRows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $normalized = array_map(
                fn (mixed $cell): string => $this->normalizeSpreadsheetCell($cell),
                $row,
            );

            if ($this->rowHasContent($normalized)) {
                $rows[] = $normalized;
            }
        }

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    protected function spreadsheetToRows(Spreadsheet $spreadsheet): array
    {
        $rows = [];

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            foreach ($sheet->toArray(null, true, true, false) as $row) {
                $normalized = array_map(
                    fn (mixed $cell): string => $this->normalizeSpreadsheetCell($cell),
                    is_array($row) ? $row : [],
                );

                if ($this->rowHasContent($normalized)) {
                    $rows[] = $normalized;
                }
            }
        }

        return $rows;
    }

    protected function normalizeSpreadsheetCell(mixed $cell): string
    {
        if ($cell === null) {
            return '';
        }

        if (is_string($cell)) {
            return trim($cell);
        }

        if (is_int($cell) || is_float($cell)) {
            $value = (string) $cell;

            return str_contains($value, '.') ? rtrim(rtrim($value, '0'), '.') : $value;
        }

        if ($cell instanceof \DateTimeInterface) {
            return $cell->format('Y-m-d');
        }

        return trim((string) $cell);
    }

    /**
     * @param  array<int, string>  $row
     */
    protected function rowHasContent(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim($cell) !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function missingItemsMessage(array $rows): string
    {
        foreach ($rows as $row) {
            $flat = implode(' ', $row);
            if (str_contains($flat, '-W&D Cost-')) {
                return 'Accounting sections were detected, but no priced line items could be read. Ensure each section includes CODE, QTY, and Total Cost.';
            }
        }

        return 'The file does not match the BIBO accounting sheet layout. Expected a client quotation table or section headers such as "PROJECT-W&D Cost-CODE".';
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function attachWorkbookDrawings(array $payload, string $path, string $extension): array
    {
        $lines = $payload['lines'] ?? [];
        if ($lines === []) {
            return $payload;
        }

        $codes = array_column($lines, 'code');
        $mediaByCode = $this->drawingExtractor->extractBySheetCodes($path, $extension, $codes);

        foreach ($lines as $index => $line) {
            $code = $line['code'] ?? null;
            $embeddedMedia = is_string($code) ? ($mediaByCode[$code] ?? null) : null;
            if ($embeddedMedia === null) {
                $embeddedMedia = $this->drawingExtractor->emptyEmbeddedMedia('none_found');
            }
            $embeddedMedia = $this->drawingExtractor->prepareMediaForJson($embeddedMedia);

            $accounting = $line['metadata']['accounting'] ?? [];
            $accounting['drawing'] = [
                'elevation' => array_filter([
                    'width_mm' => $line['width_mm'] ?? null,
                    'height_mm' => $line['height_mm'] ?? null,
                    'source' => ($line['width_mm'] ?? null) > 0 ? 'accounting' : null,
                ], fn (mixed $value): bool => $value !== null && $value !== ''),
                'embedded_media' => $embeddedMedia,
            ];

            $lines[$index]['metadata']['accounting'] = $accounting;

            if (($embeddedMedia['status'] ?? null) === 'extracted' && is_string($embeddedMedia['data_url'] ?? null)) {
                $lines[$index]['picture_data_url'] = $embeddedMedia['data_url'];
            }
        }

        $payload['lines'] = $lines;

        return $payload;
    }

    /**
     * Scan cells above the cost breakdown for overall elevation dimensions (400–8000 mm).
     *
     * @param  array<int, array<int, string>>  $rows
     * @return array{width_mm: float|null, height_mm: float|null}
     */
    protected function scanCostSectionDimensions(array $rows): array
    {
        $candidates = [];
        $metadataNumbers = $this->collectCostSectionMetadataNumbers($rows);

        foreach ($rows as $row) {
            $flat = implode(' ', $row);

            if (str_contains($flat, 'DIRECT COST') || str_contains($flat, '一、DIRECT')) {
                break;
            }

            if ($this->rowContainsCostSectionLabel($flat)) {
                continue;
            }

            foreach ($row as $colIndex => $cell) {
                if ($colIndex > 10) {
                    continue;
                }

                $value = $this->parseDimensionNumber($cell);
                if ($value === null || in_array($value, $metadataNumbers, true)) {
                    continue;
                }

                $candidates[] = $value;
            }
        }

        if ($candidates === []) {
            return ['width_mm' => null, 'height_mm' => null];
        }

        rsort($candidates);
        $height = $candidates[0];
        $width = null;

        foreach (array_slice($candidates, 1) as $value) {
            if ($value !== $height) {
                $width = $value;
                break;
            }
        }

        if ($width === null && count($candidates) >= 2) {
            $width = $candidates[1];
        }

        return [
            'width_mm' => $width > 0 ? round($width, 2) : null,
            'height_mm' => $height > 0 ? round($height, 2) : null,
        ];
    }

    /**
     * @return array<int, float>
     */
    protected function collectCostSectionMetadataNumbers(array $rows): array
    {
        $numbers = [];

        foreach (['QTY', 'SQM', 'TOTAL SQM', 'PRICE'] as $label) {
            $value = $this->findLabelValue($rows, $label);
            if ($value !== null && is_numeric(str_replace(',', '', $value))) {
                $numbers[] = (float) str_replace(',', '', $value);
            }
        }

        foreach ($rows as $row) {
            $flat = implode(' ', $row);
            if (! str_contains($flat, 'USD/SQM')) {
                continue;
            }

            foreach ($row as $cell) {
                $parsed = $this->parseMoney($cell);
                if ($parsed !== null && $parsed > 0 && $parsed < 400) {
                    $numbers[] = $parsed;
                }
            }
        }

        return $numbers;
    }

    protected function rowContainsCostSectionLabel(string $flat): bool
    {
        foreach ([
            'SERIS', 'SERIES', 'CODE', 'QTY', 'SQM', 'TOTAL SQM',
            'IN COLOUR', 'OUT COLOUR', 'LOCATION', 'MARK', 'PRICE', 'USD/SQM',
            '-W&D Cost-',
        ] as $label) {
            if (str_contains($flat, $label)) {
                return true;
            }
        }

        return false;
    }

    protected function parseDimensionNumber(string $cell): ?float
    {
        $cell = trim($cell);
        if ($cell === '' || ! is_numeric($cell)) {
            return null;
        }

        $value = (float) $cell;
        if ($value < 400 || $value > 8000) {
            return null;
        }

        return $value;
    }
}
