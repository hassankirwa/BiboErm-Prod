<?php

namespace App\Http\Controllers\Design;

use App\Enums\Design\DesignJobStatus;
use App\Http\Controllers\Controller;
use App\Models\DesignJob;
use App\Models\QuotationRequest;
use App\Models\User;
use App\Services\Crm\Leads\AccountProvisioningService;
use App\Services\Crm\Leads\LeadPipelineService;
use App\Services\Design\DesignDocumentBridgeService;
use App\Services\Design\DesignJobService;
use App\Services\Design\WincadUploadService;
use App\Services\Notifications\AssignmentNotificationService;
use App\Services\SiteOps\MeasurementPackageService;
use App\Support\BiboStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DesignJobController extends Controller
{
    public function __construct(
        protected DesignJobService $designJobService,
        protected MeasurementPackageService $packageService,
        protected WincadUploadService $wincadUploadService,
        protected DesignDocumentBridgeService $documentBridge,
        protected LeadPipelineService $leadPipelineService,
        protected AccountProvisioningService $accountProvisioning,
        protected AssignmentNotificationService $assignmentNotifications,
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

        $this->assignmentNotifications->notifyDesignJobAssigned($job, $designer, $request->user());

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

    public function downloadDocument(DesignJob $designJob, string $type): StreamedResponse|JsonResponse
    {
        if (! in_array($type, ['accounting', 'design'], true)) {
            return response()->json(['message' => 'Invalid document type.'], 422);
        }

        $account = $this->documentBridge->resolveAccountForDesignJob($designJob);
        if (! $account) {
            return response()->json(['message' => 'No account linked to this design job.'], 422);
        }

        $document = $this->documentBridge->latestAccountDocument($account, $type);
        if (! $document || ! $document->file_path) {
            return response()->json(['message' => ucfirst($type).' document not found.'], 404);
        }

        $disk = Storage::disk(BiboStorage::diskName());
        if (! $disk->exists($document->file_path)) {
            return response()->json(['message' => 'Document file is unavailable.'], 404);
        }

        $filename = $document->filename ?? basename($document->file_path);
        $mime = $disk->mimeType($document->file_path) ?: 'application/octet-stream';

        return response()->stream(function () use ($disk, $document): void {
            $stream = $disk->readStream($document->file_path);

            if (! is_resource($stream)) {
                return;
            }

            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    public function upload(Request $request, DesignJob $designJob): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $result = $this->documentBridge->uploadFabricationToDesignJob(
            $designJob,
            $validated['file'],
            $request->user(),
        );

        return response()->json([
            'data' => [
                'extraction' => $result['extraction'],
                'design_job' => $this->serialize(
                    $result['design_job']->load([
                        'lead',
                        'files',
                        'extractedItems',
                    ]),
                ),
            ],
        ]);
    }

    public function uploadAccounting(Request $request, DesignJob $designJob): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480'],
        ]);

        $account = $this->documentBridge->resolveAccountForDesignJob($designJob);
        if (! $account) {
            return response()->json(['message' => 'No account linked to this design job.'], 422);
        }

        $document = $this->documentBridge->storeAccountDocument(
            $account,
            $validated['file'],
            'accounting',
            $request->user(),
        );

        return response()->json([
            'data' => [
                'accounting_document' => [
                    'id' => $document->id,
                    'filename' => $document->filename,
                ],
                'design_job' => $this->serialize(
                    $designJob->fresh()->load(['lead', 'files', 'extractedItems', 'assignedDesigner']),
                ),
            ],
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
        $latestFile = $job->relationLoaded('files')
            ? $job->files->sortByDesc('id')->first()
            : null;

        $account = $this->documentBridge->resolveAccountForDesignJob($job);

        return [
            'id' => $job->id,
            'design_job_number' => $job->design_job_number,
            'lead_id' => $job->lead_id,
            'account_id' => $account?->id,
            'site_visit_id' => $job->site_visit_id,
            'measurement_report_id' => $job->measurement_report_id,
            'assigned_designer_id' => $job->assigned_designer_id,
            'assigned_designer' => $job->relationLoaded('assignedDesigner') && $job->assignedDesigner ? [
                'id' => $job->assignedDesigner->id,
                'name' => $job->assignedDesigner->name,
            ] : null,
            'status' => $job->status instanceof DesignJobStatus ? $job->status->value : $job->status,
            'downloaded_at' => $job->downloaded_at?->toIso8601String(),
            'design_started_at' => $job->design_started_at?->toIso8601String(),
            'uploaded_at' => $job->uploaded_at?->toIso8601String(),
            'reviewed_at' => $job->reviewed_at?->toIso8601String(),
            'approved_at' => $job->approved_at?->toIso8601String(),
            'review_notes' => $job->review_notes,
            'files_count' => $job->relationLoaded('files') ? $job->files->count() : null,
            'extracted_items_count' => $job->relationLoaded('extractedItems') ? $job->extractedItems->count() : null,
            'latest_extraction' => $latestFile?->parsed_metadata,
            'files' => $job->relationLoaded('files')
                ? $job->files->map(fn ($file) => [
                    'id' => $file->id,
                    'file_name' => $file->file_name,
                    'file_type' => $file->file_type,
                    'uploaded_at' => $file->uploaded_at?->toIso8601String(),
                ])->values()->all()
                : null,
            'extracted_items' => $job->relationLoaded('extractedItems')
                ? $job->extractedItems->map(fn ($item) => [
                    'id' => $item->id,
                    'wd_code' => $item->wd_code,
                    'name' => $item->name,
                    'code_no' => $item->code_no,
                    'quantity' => $item->quantity,
                    'colour' => $item->colour,
                    'specification' => $item->specification,
                ])->values()->all()
                : null,
            'lead' => $job->relationLoaded('lead') && $job->lead ? [
                'id' => $job->lead->id,
                'name' => $job->lead->name,
                'reference' => $job->lead->reference,
                'converted_account_id' => $job->lead->converted_account_id,
            ] : null,
            'account' => $account ? [
                'id' => $account->id,
                'name' => $account->name,
                'account_number' => $account->account_number,
            ] : null,
            'has_design_document' => $account
                ? $this->documentBridge->latestAccountDocument($account, 'design') !== null
                : false,
            'has_accounting_document' => $account
                ? $this->documentBridge->latestAccountDocument($account, 'accounting') !== null
                : false,
            'design_document' => ($account && ($designDoc = $this->documentBridge->latestAccountDocument($account, 'design'))) ? [
                'id' => $designDoc->id,
                'filename' => $designDoc->filename,
            ] : null,
            'accounting_document' => ($account && ($accountingDoc = $this->documentBridge->latestAccountDocument($account, 'accounting'))) ? [
                'id' => $accountingDoc->id,
                'filename' => $accountingDoc->filename,
            ] : null,
            'measurement_report' => $job->relationLoaded('measurementReport') && $job->measurementReport ? [
                'id' => $job->measurementReport->id,
                'report_number' => $job->measurementReport->report_number,
            ] : null,
        ];
    }
}
