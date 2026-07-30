<?php

namespace App\Services\Warehouse\MasterData;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;

class MaterialMasterExcelService
{
    public function extractFromUpload(UploadedFile $file): array
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        if (! in_array($extension, ['xls', 'xlsx', 'csv'], true)) {
            throw ValidationException::withMessages([
                'file' => ['Upload a material list as .xlsx, .xls, or .csv.'],
            ]);
        }

        $items = $extension === 'csv'
            ? $this->extractFromCsv($file->getRealPath() ?: $file->getPathname())
            : $this->extractFromWorkbook($file->getRealPath() ?: $file->getPathname());

        if ($items === []) {
            throw ValidationException::withMessages([
                'file' => ['No material rows were parsed; expected headers Code and Description.'],
            ]);
        }

        return [
            'items' => $items,
            'summary' => [
                'total_items' => count($items),
                'sample_codes' => array_slice(array_column($items, 'code'), 0, 10),
            ],
            'source_filename' => $file->getClientOriginalName(),
        ];
    }

    protected function extractFromWorkbook(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $items = [];
        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $rows = $sheet->toArray(null, true, true, false);
            $items = array_merge($items, $this->extractRows($rows));
        }

        return $this->dedupeByCode($items);
    }

    protected function extractFromCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if (! is_resource($handle)) {
            return [];
        }
        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);

        return $this->dedupeByCode($this->extractRows($rows));
    }

    protected function extractRows(array $rows): array
    {
        $headerRow = null;
        foreach ($rows as $idx => $row) {
            $normalized = array_map(fn ($v) => mb_strtolower(trim((string) $v)), $row);
            if (in_array('code', $normalized, true) && in_array('description', $normalized, true)) {
                $headerRow = [
                    'index' => $idx,
                    'code_col' => (int) array_search('code', $normalized, true),
                    'description_col' => (int) array_search('description', $normalized, true),
                ];
                break;
            }
        }
        if ($headerRow === null) {
            return [];
        }

        $items = [];
        foreach ($rows as $idx => $row) {
            if ($idx <= $headerRow['index']) {
                continue;
            }
            $code = trim((string) ($row[$headerRow['code_col']] ?? ''));
            $description = trim((string) ($row[$headerRow['description_col']] ?? ''));
            if ($code === '') {
                continue;
            }
            $items[] = [
                'code' => $code,
                'description' => $description !== '' ? $description : $code,
            ];
        }

        return $items;
    }

    protected function dedupeByCode(array $items): array
    {
        $seen = [];
        $deduped = [];
        foreach ($items as $item) {
            $key = strtoupper(trim((string) ($item['code'] ?? '')));
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $deduped[] = $item;
        }

        return $deduped;
    }
}
