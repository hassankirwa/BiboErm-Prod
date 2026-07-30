<?php

namespace App\Services\Procurement\Requisitions;

use App\Models\Procurement\PurchaseRequisition;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class PurchaseRequisitionXlsxExportService
{
    public function export(PurchaseRequisition $requisition): string
    {
        $requisition->loadMissing(['lines.warehouseItem', 'project', 'supplier', 'requester']);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Requisition Lines');
        $sheet->fromArray([
            'Requisition',
            'Project Ref',
            'Supplier',
            'Status',
            'Trigger',
            'Warehouse SKU',
            'Description',
            'Quantity',
            'Required Quantity',
            'Unit',
            'Estimated Unit Price',
            'Warehouse Item ID',
        ], null, 'A1');

        $row = 2;
        foreach ($requisition->lines as $line) {
            $sheet->fromArray([
                $requisition->reference,
                $requisition->project?->reference,
                $requisition->supplier?->name,
                $requisition->status?->value ?? $requisition->status,
                $line->trigger_type?->value ?? $line->trigger_type,
                $line->sku ?? $line->warehouseItem?->sku,
                $line->description,
                (float) $line->quantity,
                (float) $line->required_quantity,
                $line->unit_of_measure ?? $line->warehouseItem?->unit_of_measure,
                $line->estimated_unit_price,
                $line->warehouse_item_id,
            ], null, 'A'.$row);
            $row++;
        }

        $sheet->getStyle('A1:L1')->getFont()->setBold(true);
        foreach (range('A', 'L') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $path = tempnam(sys_get_temp_dir(), 'purchase-requisition-').'.xlsx';
        @unlink($path);
        (new Xlsx($spreadsheet))->save($path);

        return $path;
    }
}
