<?php

namespace App\Services\Projects;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\BaseDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;

class WorkbookDrawingExtractor
{
    /** @var array<string, array<string, array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>>> */
    protected array $sheetRowMapsByPath = [];

    /**
     * Map embedded drawings to 1-based Excel row numbers for every sheet (single pass).
     *
     * @return array<string, array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>>
     */
    public function extractMapsByRowForAllSheets(string $path, string $extension): array
    {
        $cacheKey = $path.'|'.$extension;
        if (isset($this->sheetRowMapsByPath[$cacheKey])) {
            return $this->sheetRowMapsByPath[$cacheKey];
        }

        if (! in_array($extension, ['xlsx', 'xls'], true)) {
            return $this->sheetRowMapsByPath[$cacheKey] = [];
        }

        if ($extension === 'xlsx') {
            $zipMaps = $this->extractXlsxDrawingMapsBySheet($path);
            if ($zipMaps !== null) {
                return $this->sheetRowMapsByPath[$cacheKey] = $zipMaps;
            }
        }

        return $this->sheetRowMapsByPath[$cacheKey] = $this->extractSpreadsheetDrawingMapsBySheet($path, $extension);
    }

    /**
     * Map embedded drawings to 1-based Excel row numbers for a single sheet.
     *
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>
     */
    public function extractMapByRowForSheet(string $path, string $extension, string $sheetName): array
    {
        $maps = $this->extractMapsByRowForAllSheets($path, $extension);

        return $maps[$sheetName] ?? [];
    }

    /**
     * @param  list<string>  $codes
     * @return array<string, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>
     */
    public function extractBySheetCodes(string $path, string $extension, array $codes): array
    {
        $codes = array_values(array_filter(array_map(
            fn (mixed $code): ?string => is_string($code) && trim($code) !== '' ? trim($code) : null,
            $codes,
        )));

        if ($codes === []) {
            return [];
        }

        $results = [];
        foreach ($codes as $code) {
            $results[$code] = $this->emptyEmbeddedMedia('none_found');
        }

        if (! in_array($extension, ['xlsx', 'xls'], true)) {
            return $results;
        }

        $maps = $this->extractMapsByRowForAllSheets($path, $extension);

        foreach ($codes as $code) {
            $sheetMap = $maps[$code] ?? null;
            if (! is_array($sheetMap) || $sheetMap === []) {
                continue;
            }

            $first = reset($sheetMap);
            if (is_array($first) && ($first['status'] ?? null) === 'extracted') {
                $results[$code] = $first;
            }
        }

        $missingCodes = array_keys(array_filter(
            $results,
            fn (array $media): bool => ($media['status'] ?? null) !== 'extracted',
        ));

        if ($missingCodes !== [] && $extension === 'xlsx') {
            $sequential = $this->extractXlsxMediaByIndex($path, count($missingCodes));
            foreach ($missingCodes as $index => $code) {
                if (($sequential[$index]['status'] ?? null) === 'extracted') {
                    $results[$code] = $sequential[$index];
                }
            }
        }

        return $results;
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>
     */
    public function extractBySequentialIndex(string $path, string $extension, int $itemCount): array
    {
        if ($itemCount <= 0) {
            return [];
        }

        $sheetImages = $this->extractSpreadsheetDrawingImages($path, $extension, $itemCount);
        $hasExtracted = collect($sheetImages)->contains(
            fn (array $media): bool => ($media['status'] ?? null) === 'extracted',
        );

        if ($hasExtracted) {
            return $sheetImages;
        }

        if ($extension === 'xlsx') {
            return $this->extractXlsxMediaByIndex($path, $itemCount);
        }

        return array_fill(0, $itemCount, $this->emptyEmbeddedMedia('unsupported_format'));
    }

    /**
     * Fast path: parse OOXML drawing anchors + media without PhpSpreadsheet image materialization.
     *
     * @return array<string, array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>>|null
     */
    protected function extractXlsxDrawingMapsBySheet(string $path): ?array
    {
        if (! class_exists(\ZipArchive::class)) {
            return null;
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return null;
        }

        try {
            $workbookXml = $zip->getFromName('xl/workbook.xml');
            $workbookRelsXml = $zip->getFromName('xl/_rels/workbook.xml.rels');
            if (! is_string($workbookXml) || ! is_string($workbookRelsXml)) {
                return null;
            }

            $sheetTargetsByRid = $this->parseRelationshipTargets($workbookRelsXml);
            $sheetPathByName = [];

            if (preg_match_all(
                '/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/i',
                $workbookXml,
                $sheetMatches,
                PREG_SET_ORDER,
            )) {
                foreach ($sheetMatches as $match) {
                    $name = html_entity_decode($match[1], ENT_QUOTES | ENT_XML1);
                    $target = $sheetTargetsByRid[$match[2]] ?? null;
                    if ($target === null) {
                        continue;
                    }
                    $sheetPathByName[$name] = $this->normalizeZipPath('xl/'.$target);
                }
            }

            if ($sheetPathByName === []) {
                return null;
            }

            $maps = [];
            foreach ($sheetPathByName as $sheetName => $sheetPath) {
                $maps[$sheetName] = $this->extractSheetDrawingMapFromZip($zip, $sheetPath);
            }

            return $maps;
        } finally {
            $zip->close();
        }
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>
     */
    protected function extractSheetDrawingMapFromZip(\ZipArchive $zip, string $sheetPath): array
    {
        $sheetDir = dirname($sheetPath);
        $relsPath = $sheetDir.'/_rels/'.basename($sheetPath).'.rels';
        $relsXml = $zip->getFromName($relsPath);
        if (! is_string($relsXml)) {
            return [];
        }

        $drawingTarget = null;
        foreach ($this->parseRelationshipTargets($relsXml) as $target) {
            if (str_contains($target, 'drawings/')) {
                $drawingTarget = $target;
                break;
            }
        }

        if ($drawingTarget === null) {
            return [];
        }

        $drawingPath = $this->normalizeZipPath($sheetDir.'/'.$drawingTarget);
        $drawingXml = $zip->getFromName($drawingPath);
        if (! is_string($drawingXml) || $drawingXml === '') {
            return [];
        }

        $drawingRelsPath = dirname($drawingPath).'/_rels/'.basename($drawingPath).'.rels';
        $drawingRelsXml = $zip->getFromName($drawingRelsPath);
        $mediaByRid = is_string($drawingRelsXml)
            ? $this->parseRelationshipTargets($drawingRelsXml)
            : [];

        $results = [];

        if (preg_match_all(
            '/<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/i',
            $drawingXml,
            $anchors,
        )) {
            foreach ($anchors[0] as $anchorXml) {
                if (! preg_match('/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/i', $anchorXml, $rowMatch)) {
                    continue;
                }

                $row = ((int) $rowMatch[1]) + 1;
                if ($row <= 0 || isset($results[$row])) {
                    continue;
                }

                if (! preg_match('/r:embed="([^"]+)"/i', $anchorXml, $embedMatch)) {
                    continue;
                }

                $mediaTarget = $mediaByRid[$embedMatch[1]] ?? null;
                if ($mediaTarget === null) {
                    continue;
                }

                $mediaPath = $this->normalizeZipPath(dirname($drawingPath).'/'.$mediaTarget);
                $contents = $zip->getFromName($mediaPath);
                if (! is_string($contents) || $contents === '') {
                    continue;
                }

                $basename = basename($mediaPath);
                $mimeType = $this->mimeFromMediaFilename($basename);

                $results[$row] = [
                    'status' => 'extracted',
                    'files' => [$basename],
                    'data_url' => null,
                    'mime_type' => $mimeType,
                    'note' => null,
                    'binary' => $contents,
                ];
            }
        }

        return $results;
    }

    /**
     * @return array<string, string>
     */
    protected function parseRelationshipTargets(string $relsXml): array
    {
        $targets = [];

        if (! preg_match_all(
            '/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/i',
            $relsXml,
            $matches,
            PREG_SET_ORDER,
        )) {
            return [];
        }

        foreach ($matches as $match) {
            $targets[$match[1]] = $match[2];
        }

        return $targets;
    }

    protected function normalizeZipPath(string $path): string
    {
        $path = str_replace('\\', '/', $path);
        $parts = [];

        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                array_pop($parts);
                continue;
            }
            $parts[] = $part;
        }

        return implode('/', $parts);
    }

    /**
     * @return array<string, array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>>
     */
    protected function extractSpreadsheetDrawingMapsBySheet(string $path, string $extension): array
    {
        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(false);
            $spreadsheet = $reader->load($path);
        } catch (\Throwable) {
            return [];
        }

        $maps = [];
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $results = [];
            foreach ($sheet->getDrawingCollection() as $drawing) {
                $coordinates = $drawing->getCoordinates();
                if (! preg_match('/(\d+)/', (string) $coordinates, $matches)) {
                    continue;
                }

                $row = (int) $matches[1];
                if ($row <= 0 || isset($results[$row])) {
                    continue;
                }

                $media = $this->drawingToMedia($drawing);
                if ($media === null) {
                    continue;
                }

                $results[$row] = $media;
            }

            $maps[$sheet->getTitle()] = $results;
        }

        return $maps;
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>
     */
    protected function extractXlsxMediaByIndex(string $path, int $itemCount): array
    {
        if (! class_exists(\ZipArchive::class)) {
            return array_fill(
                0,
                $itemCount,
                $this->emptyEmbeddedMedia('zip_unavailable', 'ZipArchive is not available for media extraction.'),
            );
        }

        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return array_fill(
                0,
                $itemCount,
                $this->emptyEmbeddedMedia('open_failed', 'Could not open workbook for media extraction.'),
            );
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
                'data_url' => null,
                'mime_type' => $mimeType,
                'note' => null,
                'binary' => $contents,
            ];
        }

        $zip->close();

        return $results;
    }

    /**
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}>
     */
    protected function extractSpreadsheetDrawingImages(string $path, string $extension, int $itemCount): array
    {
        if ($extension === 'xls' && ! extension_loaded('gd')) {
            return array_fill(
                0,
                $itemCount,
                $this->emptyEmbeddedMedia(
                    'requires_gd_extension',
                    'Legacy .xls workbooks store embedded elevation drawings as binary blips. Enable the PHP GD extension to extract image bytes.',
                ),
            );
        }

        $results = array_fill(0, $itemCount, $this->emptyEmbeddedMedia('none_found'));
        $ordered = [];

        foreach ($maps as $sheetMap) {
            foreach ($sheetMap as $row => $media) {
                if (($media['status'] ?? null) !== 'extracted') {
                    continue;
                }

                $ordered[] = [
                    'row' => (int) $row,
                    'media' => $media,
                ];
            }
        }

        usort($ordered, fn (array $a, array $b): int => $a['row'] <=> $b['row']);

        foreach ($ordered as $index => $entry) {
            if ($index >= $itemCount) {
                break;
            }

            $results[$index] = $entry['media'];
        }

        return $results;
    }

    /**
     * @return array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}
     */
    public function emptyEmbeddedMedia(string $status, ?string $note = null): array
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

    /**
     * @return array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null, binary?: string|null}|null
     */
    protected function drawingToMedia(BaseDrawing $drawing): ?array
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

            return [
                'status' => 'extracted',
                'files' => [],
                'data_url' => null,
                'mime_type' => $mimeType,
                'note' => null,
                'binary' => $imageContents,
            ];
        }

        $drawingPath = $drawing->getPath();
        if ($drawingPath !== '') {
            $contents = @file_get_contents($drawingPath);
            if (! is_string($contents) || $contents === '') {
                return null;
            }

            $mimeType = $this->mimeFromMediaFilename($drawingPath);

            return [
                'status' => 'extracted',
                'files' => [basename($drawingPath)],
                'data_url' => null,
                'mime_type' => $mimeType,
                'note' => null,
                'binary' => $contents,
            ];
        }

        return null;
    }

    /** @deprecated Prefer drawingToMedia — kept for callers that still need data URLs. */
    protected function drawingToDataUrl(BaseDrawing $drawing): ?string
    {
        $media = $this->drawingToMedia($drawing);
        if ($media === null || empty($media['binary']) || empty($media['mime_type'])) {
            return null;
        }

        return 'data:'.$media['mime_type'].';base64,'.base64_encode($media['binary']);
    }
}
