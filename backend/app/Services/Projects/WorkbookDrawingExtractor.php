<?php

namespace App\Services\Projects;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\BaseDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\MemoryDrawing;

class WorkbookDrawingExtractor
{
    /**
     * @return array<string, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}>
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

        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(false);
            $spreadsheet = $reader->load($path);
        } catch (\Throwable) {
            foreach ($codes as $code) {
                $results[$code] = $this->emptyEmbeddedMedia('extraction_failed', 'Could not load workbook drawings.');
            }

            return $results;
        }

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $title = trim($sheet->getTitle());
            if ($title === '' || ! isset($results[$title])) {
                continue;
            }

            foreach ($sheet->getDrawingCollection() as $drawing) {
                $dataUrl = $this->drawingToDataUrl($drawing);
                if ($dataUrl === null) {
                    continue;
                }

                $results[$title] = [
                    'status' => 'extracted',
                    'files' => [],
                    'data_url' => $dataUrl,
                    'mime_type' => $this->mimeFromDataUrl($dataUrl),
                    'note' => null,
                ];
                break;
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
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}>
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
     * @return array<int, array{status: string, files: array<int, string>, data_url: string|null, mime_type: string|null, note: string|null}>
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
}
