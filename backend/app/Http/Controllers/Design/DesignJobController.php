<?php

namespace App\Http\Controllers\Design;

use App\Enums\Design\DesignJobStatus;
use App\Http\Controllers\Controller;
use App\Models\DesignJob;
use App\Models\QuotationRequest;
use App\Models\User;
use App\Services\Crm\Leads\AccountProvisioningService;
use App\Services\Crm\Leads\LeadPipelineService;
use App\Services\Design\DesignJobService;
use App\Services\Design\WincadUploadService;
use App\Services\SiteOps\MeasurementPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignJobController extends Controller
{
    public function __construct(
        protected DesignJobService $designJobService,
        protected MeasurementPackageService $packageService,
        protected WincadUploadService $wincadUploadService,
        protected LeadPipelineService $leadPipelineService,
        protected AccountProvisioningService $accountProvisioning,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = DesignJob::query()
            ->with(['lead', 'siteVisit', 'measurementReport', 'assignedDesigner'])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($leadId = $request->query('lead_id')) {
            $query->where('lead_id', $leadId);
        }

        $jobs = $query->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => $jobs->through(fn (DesignJob $job) => $this->serialize($job))->items(),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ]);
    }

    public function show(DesignJob $designJob): JsonResponse
    {
        return response()->json([
            'data' => $this->serialize(
                $designJob->load([
                    'lead',
                    'siteVisit',
                    'measurementReport',
                    'assignedDesigner',
                    'files',
                    'extractedItems',
                    'quotationRequest',
                ])
            ),
        ]);
    }

    public function assign(Request $request, DesignJob $designJob): JsonResponse
    {
        $validated = $request->validate([
            'assigned_designer_id' => ['required', 'exists:users,id'],
        ]);

        $designer = User::query()->findOrFail($validated['assigned_designer_id']);
        $job = $this->designJobService->assignDesigner($designJob, $designer, $request->user());

        if ($job->lead) {
            $this->leadPipelineService->onDesignJobAssigned($job->lead, $request->user());
        }

        return response()->json(['data' => $this->serialize($job)]);
    }

    public function downloadPackage(DesignJob $designJob): JsonResponse
    {
        $report = $designJob->measurementReport;

        if (! $report) {
            return response()->json(['message' => 'No measurement report linked to this design job.'], 422);
        }

        $this->designJobService->markPackageDownloaded($designJob, request()->user());

        return response()->json([
            'data' => $this->packageService->downloadPackage($report),
        ]);
    }

    public function extract(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480'],
        ]);

        return response()->json([
            'data' => $this->wincadUploadService->extractFromUpload($validated['file']),
        ]);
    }

    public function approve(Request $request, DesignJob $designJob): JsonResponse
    {
        $validated = $request->validate([
            'review_notes' => ['nullable', 'string'],
        ]);

        $job = $this->designJobService->approve(
            $designJob,
            $request->user(),
            $validated['review_notes'] ?? null,
        );

        if ($job->lead) {
            $this->leadPipelineService->onReadyForQuotation($job->lead, $request->user());

            QuotationRequest::query()->firstOrCreate(
                ['design_job_id' => $job->id],
                [
                    'request_number' => 'QR-'.strtoupper(\Illuminate\Support\Str::random(8)),
                    'lead_id' => $job->lead_id,
                    'measurement_report_id' => $job->measurement_report_id,
                    'status' => 'ready_for_quotation',
                ],
            );

            try {
                $this->accountProvisioning->provisionFromLead($job->lead->fresh(), $request->user());
            } catch (\Throwable) {
                // Account may already exist or lead not yet eligible.
            }
        }

        return response()->json(['data' => $this->serialize($job)]);
    }

    /** @return array<string, mixed> */
    protected function serialize(DesignJob $job): array
    {
        return [
            'id' => $job->id,
            'design_job_number' => $job->design_job_number,
            'lead_id' => $job->lead_id,
            'site_visit_id' => $job->site_visit_id,
            'measurement_report_id' => $job->measurement_report_id,
            'assigned_designer_id' => $job->assigned_designer_id,
            'status' => $job->status instanceof DesignJobStatus ? $job->status->value : $job->status,
            'downloaded_at' => $job->downloaded_at?->toIso8601String(),
            'design_started_at' => $job->design_started_at?->toIso8601String(),
            'uploaded_at' => $job->uploaded_at?->toIso8601String(),
            'reviewed_at' => $job->reviewed_at?->toIso8601String(),
            'approved_at' => $job->approved_at?->toIso8601String(),
            'review_notes' => $job->review_notes,
            'files_count' => $job->relationLoaded('files') ? $job->files->count() : null,
            'extracted_items_count' => $job->relationLoaded('extractedItems') ? $job->extractedItems->count() : null,
        ];
    }
}
