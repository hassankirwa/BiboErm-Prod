<?php

namespace App\Services\Design;

use App\Enums\Design\DesignJobStatus;
use App\Models\Account;
use App\Models\AccountDocument;
use App\Models\DesignFile;
use App\Models\DesignJob;
use App\Models\ExtractedDesignItem;
use App\Models\Lead;
use App\Models\QuotationRequest;
use App\Models\User;
use App\Services\Crm\Leads\LeadPipelineService;
use App\Services\Media\FileStorageService;
use App\Support\BiboStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DesignDocumentBridgeService
{
    public function __construct(
        protected WincadUploadService $wincadUploadService,
        protected DesignJobService $designJobService,
        protected FileStorageService $files,
        protected LeadPipelineService $leadPipelineService,
    ) {}

    /**
     * @return array{
     *     extraction: array<string, mixed>,
     *     design_job: DesignJob
     * }
     */
    public function uploadFabricationToDesignJob(
        DesignJob $job,
        UploadedFile $file,
        User $user,
    ): array {
        return DB::transaction(function () use ($job, $file, $user) {
            $extraction = $this->wincadUploadService->extractFromUpload($file);

            $stored = $this->files->store($file, 'project-documents', 'design-job-'.$job->id);

            $designFile = DesignFile::query()->create([
                'design_job_id' => $job->id,
                'file_type' => 'fabrication',
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $stored['path'],
                'uploaded_by' => $user->id,
                'uploaded_at' => now(),
                'parsed_status' => 'parsed',
                'parsed_metadata' => $extraction,
            ]);

            ExtractedDesignItem::query()
                ->where('design_job_id', $job->id)
                ->where('source_file_id', $designFile->id)
                ->delete();

            foreach ($extraction['items'] as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $dimensions = is_array($item['dimensions'] ?? null) ? $item['dimensions'] : [];

                ExtractedDesignItem::query()->create([
                    'design_job_id' => $job->id,
                    'source_file_id' => $designFile->id,
                    'item_type' => 'fabrication_item',
                    'wd_code' => $item['code'] ?? null,
                    'name' => $item['series'] ?? ($item['code'] ?? null),
                    'code_no' => $item['code'] ?? null,
                    'length' => $dimensions['width_mm'] ?? null,
                    'quantity' => (int) max((float) ($item['quantity'] ?? 1), 1),
                    'colour' => $item['colour'] ?? null,
                    'specification' => isset($dimensions['height_mm'])
                        ? 'W '.($dimensions['width_mm'] ?? '—').' × H '.($dimensions['height_mm'] ?? '—')
                        : null,
                    'notes' => is_array($item['glass'] ?? null) && $item['glass'] !== []
                        ? json_encode($item['glass'])
                        : null,
                ]);
            }

            $account = $this->resolveAccountForDesignJob($job);
            if ($account) {
                $this->storeAccountDocument($account, $file, 'design', $user);
            }

            $job = $this->designJobService->markFilesUploaded($job, $user);

            return [
                'extraction' => $extraction,
                'design_job' => $job->fresh()->load(['files', 'extractedItems']),
            ];
        });
    }

    public function storeAccountDocument(
        Account $account,
        UploadedFile $file,
        string $documentType,
        User $user,
    ): AccountDocument {
        $stored = $this->files->store(
            $file,
            'project-documents',
            'account-'.$account->id.'-'.$documentType,
        );

        AccountDocument::query()
            ->where('account_id', $account->id)
            ->where('document_type', $documentType)
            ->where('filename', $stored['filename'] ?? basename($stored['path']))
            ->delete();

        return AccountDocument::query()->create([
            'account_id' => $account->id,
            'document_type' => $documentType,
            'filename' => $stored['filename'] ?? basename($stored['path']),
            'file_path' => $stored['path'],
            'firebase_url' => $stored['url'] ?? null,
            'uploaded_by' => $user->id,
        ]);
    }

    public function resolveDesignJobForAccount(Account $account): ?DesignJob
    {
        if ($account->source_lead_id) {
            $job = DesignJob::query()
                ->where('lead_id', $account->source_lead_id)
                ->latest('id')
                ->first();

            if ($job) {
                return $job;
            }
        }

        return DesignJob::query()
            ->whereIn('site_visit_id', function ($query) use ($account) {
                $query->select('id')
                    ->from('site_visits')
                    ->where('account_id', $account->id);
            })
            ->latest('id')
            ->first();
    }

    public function resolveAccountForDesignJob(DesignJob $job): ?Account
    {
        if ($job->lead_id) {
            $lead = Lead::query()->find($job->lead_id);
            if ($lead?->converted_account_id) {
                return Account::query()->find($lead->converted_account_id);
            }

            $account = Account::query()->where('source_lead_id', $job->lead_id)->first();
            if ($account) {
                return $account;
            }
        }

        if ($job->site_visit_id) {
            $visit = $job->siteVisit;
            if ($visit?->account_id) {
                return Account::query()->find($visit->account_id);
            }
        }

        return null;
    }

    public function latestAccountDocument(Account $account, string $documentType): ?AccountDocument
    {
        return AccountDocument::query()
            ->where('account_id', $account->id)
            ->where('document_type', $documentType)
            ->latest('id')
            ->first();
    }

    public function completeDesignStageForQuotation(
        Account $account,
        User $user,
        ?UploadedFile $fabricationFile = null,
        ?UploadedFile $accountingFile = null,
    ): ?DesignJob {
        $job = $this->resolveDesignJobForAccount($account);
        if (! $job) {
            return null;
        }

        if ($fabricationFile) {
            $this->uploadFabricationToDesignJob($job, $fabricationFile, $user);
            $job = $job->fresh();
        }

        if ($accountingFile) {
            $this->storeAccountDocument($account, $accountingFile, 'accounting', $user);
        }

        $hasFabrication = $job->files()->exists()
            || $this->latestAccountDocument($account, 'design') !== null;

        if (! $hasFabrication) {
            return $job;
        }

        if (! in_array($job->status?->value ?? (string) $job->status, [
            DesignJobStatus::ReadyForQuotation->value,
            DesignJobStatus::Approved->value,
        ], true)) {
            $job = $this->designJobService->approve($job, $user, 'Completed via proforma quotation workspace.');
        }

        if ($job->lead) {
            $this->leadPipelineService->onReadyForQuotation($job->lead, $user);

            QuotationRequest::query()->firstOrCreate(
                ['design_job_id' => $job->id],
                [
                    'request_number' => 'QR-'.\Illuminate\Support\Str::upper(\Illuminate\Support\Str::random(8)),
                    'lead_id' => $job->lead_id,
                    'measurement_report_id' => $job->measurement_report_id,
                    'status' => 'ready_for_quotation',
                ],
            );
        }

        return $job->fresh();
    }

    public function advanceLeadAfterProformaCreated(Account $account, User $user): void
    {
        $lead = $account->source_lead_id
            ? Lead::query()->find($account->source_lead_id)
            : null;

        if ($lead) {
            $this->leadPipelineService->onProformaCreated($lead, $user);
        }
    }

    public function uploadedFileFromDocument(AccountDocument $document): ?UploadedFile
    {
        if (! $document->file_path) {
            return null;
        }

        $disk = Storage::disk(BiboStorage::diskName());
        if (! $disk->exists($document->file_path)) {
            return null;
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'bibo-doc-');
        if ($tempPath === false) {
            return null;
        }

        file_put_contents($tempPath, $disk->get($document->file_path));

        return new UploadedFile(
            $tempPath,
            $document->filename ?? basename($document->file_path),
            null,
            null,
            true,
        );
    }
}
