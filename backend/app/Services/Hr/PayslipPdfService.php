<?php

namespace App\Services\Hr;

use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Support\BiboStorage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class PayslipPdfService
{
    public function __construct(
        private readonly HrDocumentStorageService $storage,
    ) {}

    public function generateAndStore(PayrollEntry $entry): string
    {
        $entry->load(['user.employeeProfile', 'payrollRun']);

        $pdf = Pdf::loadView('hr.payslip-pdf', [
            'entry' => $entry,
            'run' => $entry->payrollRun,
            'employee' => $entry->user,
            'profile' => $entry->user?->employeeProfile,
        ]);

        $contents = $pdf->output();
        $run = $entry->payrollRun;
        $filename = sprintf(
            'payslip-%d-%04d-%02d.pdf',
            $entry->user_id,
            $run->period_year,
            $run->period_month,
        );
        $relativePath = "private/hr-documents/payslips/run-{$run->id}/{$filename}";

        Storage::disk(BiboStorage::diskName())->put($relativePath, $contents);

        return $relativePath;
    }
}
