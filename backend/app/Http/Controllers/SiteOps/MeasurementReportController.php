<?php

namespace App\Http\Controllers\SiteOps;

use App\Http\Controllers\Controller;
use App\Models\MeasurementReport;
use App\Models\SiteVisit;
use App\Services\SiteOps\MeasurementPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeasurementReportController extends Controller
{
    public function __construct(
        protected MeasurementPackageService $packageService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SiteVisit::class);

        $query = MeasurementReport::query()
            ->with(['siteVisit.lead', 'lead', 'submittedBy', 'reviewedBy'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($leadId = $request->query('lead_id')) {
            $query->where('lead_id', $leadId);
        }

        $reports = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => $reports->through(fn (MeasurementReport $report) => $this->serialize($report))->items(),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'last_page' => $reports->lastPage(),
                'per_page' => $reports->perPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    public function show(MeasurementReport $measurementReport): JsonResponse
    {
        $this->authorize('view', $measurementReport->siteVisit);

        return response()->json([
            'data' => $this->serialize(
                $measurementReport->load([
                    'siteVisit.measuredOpenings.photos',
                    'lead',
                    'designJob',
                    'submittedBy',
                    'reviewedBy',
                ])
            ),
        ]);
    }

    public function download(MeasurementReport $measurementReport): JsonResponse
    {
        $this->authorize('view', $measurementReport->siteVisit);

        return response()->json([
            'data' => $this->packageService->downloadPackage($measurementReport),
        ]);
    }

    /** @return array<string, mixed> */
    protected function serialize(MeasurementReport $report): array
    {
        return [
            'id' => $report->id,
            'report_number' => $report->report_number,
            'status' => $report->status,
            'site_visit_id' => $report->site_visit_id,
            'lead_id' => $report->lead_id,
            'approved_at' => $report->approved_at?->toIso8601String(),
            'pdf_path' => $report->pdf_path,
            'excel_path' => $report->excel_path,
            'photos_zip_path' => $report->photos_zip_path,
            'site_visit' => $report->relationLoaded('siteVisit') && $report->siteVisit ? [
                'id' => $report->siteVisit->id,
                'visit_number' => $report->siteVisit->visit_number,
                'title' => $report->siteVisit->title,
                'status' => $report->siteVisit->status instanceof \BackedEnum
                    ? $report->siteVisit->status->value
                    : $report->siteVisit->status,
            ] : null,
            'design_job' => $report->relationLoaded('designJob') && $report->designJob ? [
                'id' => $report->designJob->id,
                'design_job_number' => $report->designJob->design_job_number,
                'status' => $report->designJob->status instanceof \BackedEnum
                    ? $report->designJob->status->value
                    : $report->designJob->status,
            ] : null,
        ];
    }
}
