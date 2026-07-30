<?php

namespace App\Services\Projects;

use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ProjectBomXlsxExportService
{
    public function export(ProjectBom $bom): string
    {
        $bom->loadMissing(['project', 'lines.warehouseItem']);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('BOM Lines');

        $headers = [
            'BOM Version',
            'Project Ref',
            'Line Type',
            'Material Code',
            'Material Name',
            'Warehouse SKU',
            'Warehouse Item',
            'Quantity',
            'Length mm',
            'Procurement Only',
            'Glass',
            'Addon',
            'Notes',
        ];

        $sheet->fromArray($headers, null, 'A1');
        $row = 2;
        foreach ($bom->lines as $line) {
            /** @var ProjectBomLine $line */
            $sheet->fromArray([
                $bom->version,
                $bom->project?->reference,
                $line->line_type,
                $line->material_code,
                $line->material_name,
                $line->warehouseItem?->sku,
                $line->warehouseItem?->name,
                (float) $line->quantity,
                $line->measurement_mm,
                $line->is_procurement_only ? 'yes' : 'no',
                $line->is_glass ? 'yes' : 'no',
                $line->is_addon ? 'yes' : 'no',
                $line->notes,
            ], null, 'A'.$row);
            $row++;
        }

        $sheet->getStyle('A1:M1')->getFont()->setBold(true);
        foreach (range('A', 'M') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $extracted = $bom->extracted_data;
        if (is_array($extracted) && isset($extracted['items']) && is_array($extracted['items'])) {
            $itemsSheet = $spreadsheet->createSheet();
            $itemsSheet->setTitle('Wincad Items');
            $itemsSheet->fromArray([
                'Code',
                'Series',
                'Quantity',
                'Colour',
                'Width mm',
                'Height mm',
                'SQM',
                'Glass Count',
                'Frame Profile Count',
                'Sash Profile Count',
                'Hardware Count',
            ], null, 'A1');

            $row = 2;
            foreach ($extracted['items'] as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $itemsSheet->fromArray([
                    $item['code'] ?? null,
                    $item['series'] ?? null,
                    $item['quantity'] ?? null,
                    $item['colour'] ?? null,
                    $item['dimensions']['width_mm'] ?? null,
                    $item['dimensions']['height_mm'] ?? null,
                    $item['dimensions']['sqm'] ?? null,
                    count($item['glass'] ?? []),
                    count($item['frame_profiles'] ?? []),
                    count($item['sash_profiles'] ?? []),
                    count($item['hardware'] ?? []),
                ], null, 'A'.$row);
                $row++;
            }

            $itemsSheet->getStyle('A1:K1')->getFont()->setBold(true);
            foreach (range('A', 'K') as $column) {
                $itemsSheet->getColumnDimension($column)->setAutoSize(true);
            }
        }

        $path = tempnam(sys_get_temp_dir(), 'project-bom-').'.xlsx';
        @unlink($path);

        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }
}
