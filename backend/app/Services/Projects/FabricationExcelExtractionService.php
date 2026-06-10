<?php

namespace App\Services\Projects;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\BaseDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;

class FabricationExcelExtractionService
{
    /**
     * @return array{
     *     project: array{name: string|null, order_no: string|null, delivery_date: string|null},
     *     items: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, source_filename: string|null}
     * }
     */
    public function extractFromUpload(UploadedFile $file): array
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        $extension = strtolower((string) $file->getClientOriginalExtension());

        if (! in_array($extension, ['csv', 'txt', 'xls', 'xlsx'], true)) {
            throw ValidationException::withMessages([
                'file' => [
                    'Unsupported file extension "'.($extension !== '' ? $extension : 'unknown').'". Upload a BIBO fabrication list as .xlsx, .xls, .csv, or .txt.',
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
                'file' => [$this->emptyParseMessage($extension)],
            ]);
        }

        return $this->attachDrawingMedia(
            $this->buildExtractionPayload($rows, $file->getClientOriginalName()),
            $path,
            $extension,
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{
     *     project: array{name: string|null, order_no: string|null, delivery_date: string|null},
     *     items: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, source_filename: string|null}
     * }
     */
    public function buildExtractionPayload(array $rows, ?string $sourceFilename = null): array
    {
        $sections = $this->splitIntoSections($rows);
        $items = [];
        $projectName = null;
        $projectNumber = null;
        $deliveryDate = null;

        foreach ($sections as $sectionRows) {
            $parsed = $this->parseSection($sectionRows);
            if ($parsed === null) {
                continue;
            }

            $projectName ??= $parsed['project']['name'] ?? null;
            $projectNumber ??= $parsed['project']['order_no'] ?? null;
            $deliveryDate ??= $parsed['project']['delivery_date'] ?? null;
            $items[] = $parsed;
        }

        if ($items === []) {
            throw ValidationException::withMessages([
                'file' => [$this->missingItemsMessage($rows)],
            ]);
        }

        return [
            'project' => [
                'name' => $projectName,
                'order_no' => $projectNumber,
                'delivery_date' => $this->normalizeDeliveryDate($deliveryDate),
            ],
            'items' => array_values($items),
            'summary' => [
                'total_items' => count($items),
                'source_filename' => $sourceFilename,
            ],
        ];
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
            if (str_contains($flat, 'Fabrication Details') || str_contains($flat, '组装清单')) {
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

        if ($sections === [] && $rows !== []) {
            return [$rows];
        }

        return $sections;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<string, mixed>|null
     */
    protected function parseSection(array $rows): ?array
    {
        $code = $this->findLabelValue($rows, 'W&D Code');
        if ($code === null || trim($code) === '') {
            return null;
        }

        $series = $this->findLabelValue($rows, 'W&D Series');
        $projectName = $this->findLabelValue($rows, 'Project Name');
        $projectNumber = $this->findLabelValue($rows, 'Order No');
        $quantity = (float) ($this->findLabelValue($rows, 'Quantity') ?? 1);
        $sqmPerPcs = (float) ($this->findLabelValue($rows, 'Sqm') ?? 0);
        $colour = $this->findLabelValue($rows, 'W&D Colour');
        $deliveryDateRaw = $this->findLabelValue($rows, 'Delivery date');
        $deliveryDate = $this->normalizeDeliveryDate($deliveryDateRaw);
        $sillHeight = $this->findLabelValue($rows, 'Sill height');
        $weight = $this->findLabelValue($rows, 'Weight');

        $frameProfiles = $this->extractFrameProfiles($rows);
        $sashProfiles = $this->extractSashProfiles($rows);
        $hardware = $this->extractHardware($rows);
        $glass = $this->extractGlassDetails($rows);
        $sashOpenings = $this->extractSashOpenings($rows);

        $dimensions = $this->resolveDimensions($rows, $frameProfiles, $sashOpenings, $sqmPerPcs);

        return [
            'code' => $code,
            'series' => $series,
            'quantity' => max($quantity, 1),
            'colour' => $colour,
            'project' => [
                'name' => $projectName,
                'order_no' => $projectNumber,
                'delivery_date' => $deliveryDate,
            ],
            'dimensions' => $dimensions,
            'glass' => $glass,
            'frame_profiles' => $frameProfiles,
            'sash_profiles' => $sashProfiles,
            'hardware' => $hardware,
            'sash_openings' => $sashOpenings,
            'packaging' => $this->extractPackagingFooter($rows),
            'drawing' => $this->buildDrawingMetadata($dimensions),
        ];
    }

    /**
     * @param  array{width_mm: float|null, height_mm: float|null, sqm: float|null, weight_kg: float|null, sill_height: float|null, source: string|null}  $dimensions
     * @return array{elevation: array{width_mm: float|null, height_mm: float|null, source: string|null}, embedded_media: null}
     */
    protected function buildDrawingMetadata(array $dimensions): array
    {
        return [
            'elevation' => [
                'width_mm' => $dimensions['width_mm'] ?? null,
                'height_mm' => $dimensions['height_mm'] ?? null,
                'source' => $dimensions['source'] ?? null,
            ],
            'embedded_media' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function attachDrawingMedia(array $payload, string $path, string $extension): array
    {
        $itemCount = count($payload['items']);
        $mediaByIndex = $this->extractWorkbookImages($path, $extension, $itemCount);

        foreach ($payload['items'] as $index => $item) {
            $itemDrawing = $item['drawing'] ?? $this->buildDrawingMetadata($item['dimensions'] ?? []);
            $itemDrawing['embedded_media'] = $mediaByIndex[$index] ?? $this->emptyEmbeddedMedia('none_found');
            $payload['items'][$index]['drawing'] = $itemDrawing;
        }

        return $payload;
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}>
     */
    protected function extractWorkbookImages(string $path, string $extension, int $itemCount): array
    {
        if ($itemCount === 0) {
            return [];
        }

        $images = match ($extension) {
            'xlsx' => $this->extractXlsxImages($path, $itemCount),
            'xls' => $this->extractSpreadsheetDrawingImages($path, $itemCount),
            default => array_fill(0, $itemCount, $this->emptyEmbeddedMedia('unsupported_format')),
        };

        if ($images !== []) {
            return $images;
        }

        return array_fill(0, $itemCount, $this->emptyEmbeddedMedia('none_found'));
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}>
     */
    protected function extractXlsxImages(string $path, int $itemCount): array
    {
        $sheetImages = $this->extractSpreadsheetDrawingImages($path, $itemCount);
        $hasExtracted = collect($sheetImages)->contains(
            fn (array $media) => ($media['status'] ?? null) === 'extracted',
        );

        if ($hasExtracted) {
            return $sheetImages;
        }

        if (! class_exists(\ZipArchive::class)) {
            return array_fill(0, $itemCount, $this->emptyEmbeddedMedia('zip_unavailable', 'ZipArchive is not available for media extraction.'));
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return array_fill(0, $itemCount, $this->emptyEmbeddedMedia('open_failed', 'Could not open workbook for media extraction.'));
        }

        $mediaFiles = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (! is_string($name) || ! preg_match('#^xl/media/(.+)$#', $name, $matches)) {
                continue;
            }

            $mediaFiles[] = [
                'path' => $name,
                'basename' => $matches[1],
            ];
        }

        usort($mediaFiles, fn (array $a, array $b) => strnatcasecmp($a['basename'], $b['basename']));

        $results = array_fill(0, $itemCount, $this->emptyEmbeddedMedia('none_found'));

        foreach ($mediaFiles as $index => $file) {
            if ($index >= $itemCount) {
                break;
            }

            $contents = $zip->getFromName($file['path']);
            if (! is_string($contents) || $contents === '') {
                continue;
            }

            $mimeType = $this->mimeFromMediaFilename($file['basename']);
            $results[$index] = [
                'status' => 'extracted',
                'files' => [$file['basename']],
                'data_url' => 'data:'.$mimeType.';base64,'.base64_encode($contents),
                'mime_type' => $mimeType,
                'note' => null,
            ];
        }

        $zip->close();

        return $results;
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}>
     */
    protected function extractSpreadsheetDrawingImages(string $path, int $itemCount): array
    {
        if (! extension_loaded('gd')) {
            return array_fill(
                0,
                $itemCount,
                $this->emptyEmbeddedMedia(
                    'requires_gd_extension',
                    'Legacy .xls workbooks store embedded elevation drawings as binary blips. Enable the PHP GD extension to extract image bytes; elevation dimensions are still parsed from profile tables and sqm.',
                ),
            );
        }

        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(false);
            $spreadsheet = $reader->load($path);
        } catch (\Throwable) {
            return array_fill(
                0,
                $itemCount,
                $this->emptyEmbeddedMedia('extraction_failed', 'Could not load workbook drawings.'),
            );
        }

        $results = array_fill(0, $itemCount, $this->emptyEmbeddedMedia('none_found'));
        $sheetIndex = 0;

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            if ($sheetIndex >= $itemCount) {
                break;
            }

            foreach ($sheet->getDrawingCollection() as $drawing) {
                $dataUrl = $this->drawingToDataUrl($drawing);
                if ($dataUrl === null) {
                    continue;
                }

                $results[$sheetIndex] = [
                    'status' => 'extracted',
                    'files' => [],
                    'data_url' => $dataUrl,
                    'mime_type' => $this->mimeFromDataUrl($dataUrl),
                    'note' => null,
                ];
                break;
            }

            $sheetIndex++;
        }

        return $results;
    }

    /**
     * @return array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}
     */
    protected function emptyEmbeddedMedia(string $status, ?string $note = null): array
    {
        return [
            'status' => $status,
            'files' => [],
            'data_url' => null,
            'mime_type' => null,
            'note' => $note,
        ];
    }

    protected function mimeFromMediaFilename(string $filename): string
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp',
            default => 'image/png',
        };
    }

    protected function mimeFromDataUrl(string $dataUrl): ?string
    {
        if (! preg_match('#^data:([^;]+);base64,#', $dataUrl, $matches)) {
            return null;
        }

        return $matches[1];
    }

    protected function drawingToDataUrl(BaseDrawing $drawing): ?string
    {
        if ($drawing instanceof MemoryDrawing) {
            ob_start();
            call_user_func($drawing->getRenderingFunction(), $drawing->getImageResource());
            $imageContents = ob_get_clean();

            if (! is_string($imageContents) || $imageContents === '') {
                return null;
            }

            $mimeType = match ($drawing->getMimeType()) {
                MemoryDrawing::MIMETYPE_PNG => 'image/png',
                MemoryDrawing::MIMETYPE_GIF => 'image/gif',
                MemoryDrawing::MIMETYPE_JPEG => 'image/jpeg',
                default => 'image/png',
            };

            return 'data:'.$mimeType.';base64,'.base64_encode($imageContents);
        }

        $drawingPath = $drawing->getPath();
        if ($drawingPath !== '' && is_readable($drawingPath)) {
            $contents = file_get_contents($drawingPath);
            if (! is_string($contents) || $contents === '') {
                return null;
            }

            $mimeType = $this->mimeFromMediaFilename($drawingPath);

            return 'data:'.$mimeType.';base64,'.base64_encode($contents);
        }

        return null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $frameProfiles
     * @param  array<int, array<string, mixed>>  $sashOpenings
     * @return array{width_mm: float|null, height_mm: float|null, sqm: float|null, weight_kg: float|null, sill_height: float|null, source: string|null}
     */
    protected function resolveDimensions(
        array $rows,
        array $frameProfiles,
        array $sashOpenings,
        float $sqmPerPcs,
    ): array {
        $sillHeight = (float) ($this->findLabelValue($rows, 'Sill height') ?? 0);
        $weight = $this->findLabelValue($rows, 'Weight');
        $weightKg = $weight !== null && is_numeric($weight) ? (float) $weight : null;

        [$frameWidth, $frameHeight] = $this->dimensionsFromFrameProfiles($frameProfiles);
        [$elevationWidth, $elevationHeight] = $this->extractElevationDimensions($rows, $frameWidth, $frameHeight);

        $height = $elevationHeight > 0 ? $elevationHeight : $frameHeight;
        $source = 'frame_profiles';

        if ($height <= 0) {
            [, $sashHeight] = $this->dimensionsFromSashOpenings($sashOpenings);
            $height = $sashHeight;
            if ($height > 0) {
                $source = 'sash_openings';
            }
        } elseif ($elevationHeight > 0) {
            $source = 'elevation';
        }

        if ($elevationWidth > 0) {
            $width = $elevationWidth;
            $source = 'elevation';
        } elseif ($frameWidth > 0) {
            $width = $frameWidth;
        } else {
            [$sashWidth] = $this->dimensionsFromSashOpenings($sashOpenings);
            $width = $sashWidth;
            if ($width > 0 && $source === 'frame_profiles') {
                $source = 'sash_openings';
            }
        }

        return [
            'width_mm' => $width > 0 ? round($width, 2) : null,
            'height_mm' => $height > 0 ? round($height, 2) : null,
            'sqm' => $sqmPerPcs > 0 ? round($sqmPerPcs, 4) : null,
            'weight_kg' => $weightKg,
            'sill_height' => $sillHeight,
            'source' => ($width > 0 && $height > 0) ? $source : null,
        ];
    }

    protected function normalizeDeliveryDate(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        return trim($raw);
    }

    /**
     * @param  array<int, array<string, mixed>>  $frameProfiles
     * @return array{0: float, 1: float}
     */
    protected function dimensionsFromFrameProfiles(array $frameProfiles): array
    {
        $width = 0.0;
        $height = 0.0;

        foreach ($frameProfiles as $profile) {
            $name = strtolower((string) ($profile['name'] ?? ''));
            $length = (float) ($profile['length_mm'] ?? 0);

            if ($length <= 0) {
                continue;
            }

            if (str_contains($name, 'side frame') || str_contains($name, '边封')) {
                $height = max($height, $length);
            }

            if (
                str_contains($name, 'top rail')
                || str_contains($name, 'bottom track')
                || str_contains($name, 'bottom flat track')
                || str_contains($name, '平上滑')
                || str_contains($name, '下滑')
                || str_contains($name, '平下轨')
            ) {
                $width = max($width, $length);
            }
        }

        return [$width, $height];
    }

    /**
     * @param  array<int, array<string, mixed>>  $sashOpenings
     * @return array{0: float, 1: float}
     */
    protected function dimensionsFromSashOpenings(array $sashOpenings): array
    {
        $width = 0.0;
        $height = 0.0;

        foreach ($sashOpenings as $opening) {
            $panelWidth = (float) ($opening['width_mm'] ?? 0);
            $panelHeight = (float) ($opening['height_mm'] ?? 0);
            $qty = (float) ($opening['qty'] ?? 1);

            if ($panelHeight > 0) {
                $height = max($height, $panelHeight);
            }

            if ($panelWidth > 0) {
                $width += $panelWidth * max($qty, 1);
            }
        }

        return [$width, $height];
    }

    /**
     * Scan drawing-area cells (before specification tables) for overall elevation dimensions.
     *
     * @return array{0: float, 1: float}
     */
    protected function extractElevationDimensions(array $rows, float $frameWidth, float $frameHeight): array
    {
        $candidates = [];
        $metadataNumbers = $this->collectMetadataNumbers($rows);

        foreach ($rows as $rowIndex => $row) {
            $flat = implode(' ', $row);
            if ($this->isSpecificationTableStart($flat)) {
                break;
            }

            if ($this->rowContainsMetadataLabel($flat)) {
                continue;
            }

            foreach ($row as $colIndex => $cell) {
                if ($colIndex > 8) {
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
            return [0.0, 0.0];
        }

        $height = 0.0;
        $width = 0.0;

        if ($frameHeight > 0) {
            foreach ($candidates as $value) {
                if (abs($value - $frameHeight) <= max(5, $frameHeight * 0.01)) {
                    $height = $value;
                    break;
                }
            }
        }

        if ($height <= 0) {
            rsort($candidates);
            $height = $candidates[0];
        }

        foreach ($candidates as $value) {
            if ($value === $height) {
                continue;
            }

            if ($frameWidth > 0 && $value >= $frameWidth && $value <= $frameWidth + 150) {
                $width = max($width, $value);
            }
        }

        if ($width <= 0 && $frameWidth > 0) {
            foreach ($candidates as $value) {
                if ($value !== $height && $value > $frameWidth) {
                    $width = max($width, $value);
                }
            }
        }

        return [$width, $height];
    }

    /**
     * @return array<int, float>
     */
    protected function collectMetadataNumbers(array $rows): array
    {
        $numbers = [];

        foreach (['Quantity', 'Sill height', 'Sqm', 'Weight'] as $label) {
            $value = $this->findLabelValue($rows, $label);
            if ($value !== null && is_numeric($value)) {
                $numbers[] = (float) $value;
            }
        }

        return $numbers;
    }

    protected function rowContainsMetadataLabel(string $flat): bool
    {
        foreach ([
            'Project Name', 'Order No', 'W&D Series', 'W&D Code', 'Quantity',
            'W&D Colour', 'Delivery date', 'Sill height', 'Sqm', 'Weight',
            'Project Add', 'Installation site',
        ] as $label) {
            if (str_contains($flat, $label)) {
                return true;
            }
        }

        return false;
    }

    protected function isSpecificationTableStart(string $flat): bool
    {
        return str_contains($flat, 'Frame profile Size')
            || str_contains($flat, '框主材尺寸')
            || str_contains($flat, 'Hardware details')
            || str_contains($flat, '五金配件');
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

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<int, array{name: string|null, code_no: string|null, length_mm: float|null, qty: float|null, corner: string|null, mark: string|null}>
     */
    protected function extractFrameProfiles(array $rows): array
    {
        return $this->extractProfileTable(
            $rows,
            ['Frame profile Size', '框主材尺寸'],
            ['Sash profile', '扇主材', 'Hardware details', '五金配件'],
            leftSide: true,
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<int, array{name: string|null, code_no: string|null, length_mm: float|null, qty: float|null, corner: string|null, mark: string|null}>
     */
    protected function extractSashProfiles(array $rows): array
    {
        return $this->extractProfileTable(
            $rows,
            ['Sash profile size', '扇主材尺寸'],
            ['Screens size', '纱窗尺寸', 'Sash Specification', '开启扇', 'All glass details', '玻璃清单'],
            leftSide: true,
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<int, array{name: string|null, specification: string|null, unit: string|null, qty: float|null, purpose: string|null, mark: string|null}>
     */
    protected function extractHardware(array $rows): array
    {
        return $this->extractRightSideTable(
            $rows,
            ['Hardware details', '五金配件'],
            ['All glass details', '玻璃清单', 'Screens size', '纱窗尺寸', 'Sash Specification', '开启扇'],
            mapRow: fn (array $row) => [
                'name' => $this->nullableString($row[1] ?? null),
                'specification' => $this->nullableString($row[2] ?? null),
                'unit' => $this->nullableString($row[3] ?? null),
                'qty' => $this->nullableFloat($row[4] ?? null),
                'purpose' => $this->nullableString($row[5] ?? null),
                'mark' => $this->nullableString($row[6] ?? null),
            ],
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<int, array{name: string|null, width_mm: float|null, height_mm: float|null, qty: float|null, specification: string|null, mark: string|null}>
     */
    protected function extractGlassDetails(array $rows): array
    {
        return $this->extractRightSideTable(
            $rows,
            ['All glass details', '玻璃清单'],
            ['Screens size', '纱窗尺寸', 'Sash Specification', '开启扇', 'Mesh size', '纱网尺寸'],
            mapRow: fn (array $row) => [
                'name' => $this->nullableString($row[1] ?? null),
                'width_mm' => $this->nullableFloat($row[2] ?? null),
                'height_mm' => $this->nullableFloat($row[3] ?? null),
                'qty' => $this->nullableFloat($row[4] ?? null),
                'specification' => $this->nullableString($row[5] ?? null),
                'mark' => $this->nullableString($row[6] ?? null),
            ],
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<int, array{type: string|null, opening: string|null, width_mm: float|null, height_mm: float|null, qty: float|null, mark: string|null}>
     */
    protected function extractSashOpenings(array $rows): array
    {
        $items = [];
        $inSection = false;
        $headerSeen = false;

        foreach ($rows as $row) {
            $flat = implode(' ', $row);

            if (str_contains($flat, 'Sash Specification') || str_contains($flat, '开启扇')) {
                $inSection = true;

                continue;
            }

            if (! $inSection) {
                continue;
            }

            if (str_contains($flat, '包装说明')) {
                break;
            }

            if (str_contains($flat, 'No.') && (str_contains($flat, 'Opening') || str_contains($flat, 'Type'))) {
                $headerSeen = true;

                continue;
            }

            if (! $headerSeen) {
                continue;
            }

            if (! $this->isDataRow($row, 0)) {
                continue;
            }

            $items[] = [
                'type' => $this->nullableString($row[1] ?? null),
                'opening' => $this->nullableString($row[2] ?? null),
                'width_mm' => $this->nullableFloat($row[3] ?? null),
                'height_mm' => $this->nullableFloat($row[4] ?? null),
                'qty' => $this->nullableFloat($row[5] ?? null),
                'mark' => $this->nullableString($row[6] ?? null),
            ];
        }

        return $items;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array<string, mixed>
     */
    protected function extractPackagingFooter(array $rows): array
    {
        $packaging = [];
        $inSection = false;

        foreach ($rows as $row) {
            $flat = implode(' ', $row);

            if (str_contains($flat, '包装说明')) {
                $inSection = true;

                continue;
            }

            if (! $inSection) {
                continue;
            }

            if (str_contains($flat, '设计：') || str_contains($flat, '设计:')) {
                break;
            }

            $trimmed = trim($flat);
            if ($trimmed !== '') {
                $packaging['notes'][] = $trimmed;
            }
        }

        foreach ($rows as $row) {
            $flat = implode(' ', $row);
            if (preg_match('/第(\d+)页,共(\d+)页/u', $flat, $matches)) {
                $packaging['page'] = (int) $matches[1];
                $packaging['total_pages'] = (int) $matches[2];
            }
        }

        return $packaging;
    }

    /**
     * @param  array<int, string>  $startMarkers
     * @param  array<int, string>  $endMarkers
     * @return array<int, array{name: string|null, code_no: string|null, length_mm: float|null, qty: float|null, corner: string|null, mark: string|null}>
     */
    protected function extractProfileTable(array $rows, array $startMarkers, array $endMarkers, bool $leftSide): array
    {
        $items = [];
        $inSection = false;
        $headerSeen = false;

        foreach ($rows as $row) {
            $flat = implode(' ', $row);

            if ($this->containsAny($flat, $startMarkers)) {
                $inSection = true;

                continue;
            }

            if (! $inSection) {
                continue;
            }

            if ($this->containsAny($flat, $endMarkers)) {
                break;
            }

            if (str_contains($flat, 'No.') && str_contains($flat, 'Code No')) {
                $headerSeen = true;

                continue;
            }

            if (! $headerSeen) {
                continue;
            }

            $dataRow = $leftSide ? array_slice($row, 0, 7) : array_slice($row, 7, 7);
            if (! $this->isDataRow($dataRow, 0)) {
                continue;
            }

            $items[] = [
                'name' => $this->nullableString($dataRow[1] ?? null),
                'code_no' => $this->nullableString($dataRow[2] ?? null),
                'length_mm' => $this->nullableFloat($dataRow[3] ?? null),
                'qty' => $this->nullableFloat($dataRow[4] ?? null),
                'corner' => $this->nullableString($dataRow[5] ?? null),
                'mark' => $this->nullableString($dataRow[6] ?? null),
            ];
        }

        return $items;
    }

    /**
     * @param  array<int, string>  $startMarkers
     * @param  array<int, string>  $endMarkers
     * @param  callable(array<int, string>): array<string, mixed>  $mapRow
     * @return array<int, array<string, mixed>>
     */
    protected function extractRightSideTable(array $rows, array $startMarkers, array $endMarkers, callable $mapRow): array
    {
        $items = [];
        $inSection = false;
        $headerSeen = false;
        $startColumn = null;

        foreach ($rows as $row) {
            $flat = implode(' ', $row);

            if ($this->containsAny($flat, $startMarkers)) {
                $inSection = true;
                $startColumn = $this->detectRightTableStartColumn($row, $startMarkers);

                continue;
            }

            if (! $inSection) {
                continue;
            }

            if ($this->containsAny($flat, $endMarkers)) {
                break;
            }

            if (str_contains($flat, 'No.') && (str_contains($flat, 'Specification') || str_contains($flat, 'pecification') || str_contains($flat, '玻璃宽'))) {
                $headerSeen = true;
                $startColumn ??= $this->detectRightTableStartColumn($row, ['No.']);

                continue;
            }

            if (! $headerSeen) {
                continue;
            }

            $offset = $startColumn ?? 7;
            $dataRow = array_slice($row, $offset, 7);
            if (! $this->isDataRow($dataRow, 0)) {
                continue;
            }

            $items[] = $mapRow($dataRow);
        }

        return $items;
    }

    /**
     * @param  array<int, string>  $row
     * @param  array<int, string>  $markers
     */
    protected function detectRightTableStartColumn(array $row, array $markers): int
    {
        foreach ($row as $index => $cell) {
            foreach ($markers as $marker) {
                if (str_contains($cell, $marker)) {
                    return max(0, $index);
                }
            }
        }

        return 7;
    }

    /**
     * @param  array<int, string>  $row
     */
    protected function isDataRow(array $row, int $numberIndex): bool
    {
        $no = trim((string) ($row[$numberIndex] ?? ''));

        return $no !== '' && ctype_digit($no);
    }

    /**
     * @param  array<int, string>  $needles
     */
    protected function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    protected function nullableString(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    protected function nullableFloat(mixed $value): ?float
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
                if ($inline !== '' && $inline !== $cell) {
                    return $inline;
                }

                for ($i = $index + 1; $i < count($row); $i++) {
                    $candidate = trim($row[$i]);
                    if ($candidate !== '') {
                        return $candidate;
                    }
                }
            }
        }

        return null;
    }

    protected function normalizeLabel(string $value): string
    {
        return trim(str_replace(['：', ':'], '', $value));
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
                'file' => ['Unsupported fabrication file format. Use .xlsx, .xls, .csv, or .txt.'],
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
        if ($this->isLegacyBinarySpreadsheet($path) && $extension === 'xlsx') {
            throw ValidationException::withMessages([
                'file' => ['This file is a legacy Excel .xls workbook. Save or export it again as .xlsx, or upload the original .xls file.'],
            ]);
        }

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

            throw ValidationException::withMessages([
                'file' => [$this->unreadableSpreadsheetMessage($extension, $exception)],
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

        $rows = [];
        foreach ($workbook->rows() as $row) {
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

    protected function isLegacyBinarySpreadsheet(string $path): bool
    {
        $header = file_get_contents($path, false, null, 0, 8);

        return is_string($header)
            && strlen($header) === 8
            && $header === "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1";
    }

    protected function emptyParseMessage(string $extension): string
    {
        return match ($extension) {
            'xls', 'xlsx' => 'The Excel file is empty or contains no readable worksheet rows.',
            'csv', 'txt' => 'The text export is empty or contains no tabular rows.',
            default => 'No fabrication line items could be parsed from the upload.',
        };
    }

    protected function unreadableSpreadsheetMessage(string $extension, \Throwable $exception): string
    {
        $label = $extension === 'xls' ? '.xls' : '.xlsx';

        return sprintf(
            'Unable to read the uploaded %s fabrication workbook. Ensure it is a valid Excel file exported from the BIBO fabrication system.',
            $label,
        );
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function missingItemsMessage(array $rows): string
    {
        if (! $this->rowsContainFabricationMarkers($rows)) {
            return 'The file does not match the BIBO fabrication list layout. Expected headers such as "Fabrication Details", "W&D Code", and "Frame profile Size".';
        }

        return 'Fabrication sections were detected, but no W&D codes could be read. Ensure each page includes a value for "W&D Code".';
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     */
    protected function rowsContainFabricationMarkers(array $rows): bool
    {
        $markers = [
            'Fabrication Details',
            '组装清单',
            'W&D Code',
            'Frame profile Size',
            '框主材尺寸',
        ];

        foreach ($rows as $row) {
            $flat = implode(' ', $row);
            foreach ($markers as $marker) {
                if (str_contains($flat, $marker)) {
                    return true;
                }
            }
        }

        return false;
    }
}
