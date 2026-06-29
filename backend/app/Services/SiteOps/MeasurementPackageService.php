<?php

namespace App\Services\SiteOps;

use App\Models\MeasurementReport;
use Illuminate\Validation\ValidationException;

class MeasurementPackageService
{
    /**
     * @return array{status: string, report_number: string, paths: array<string, string|null>}
     */
    public function downloadPackage(MeasurementReport $report): array
    {
        if (! $report->site_visit_id) {
            throw ValidationException::withMessages([
                'report' => ['Measurement report is not linked to a site visit.'],
            ]);
        }

        return [
            'status' => 'stub',
            'report_number' => $report->report_number,
            'message' => 'Measurement package generation is not yet implemented.',
            'paths' => [
                'pdf' => $report->pdf_path,
                'excel' => $report->excel_path,
                'photos_zip' => $report->photos_zip_path,
            ],
        ];
    }
}
