<?php

namespace App\Services\Projects;

use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\MeasurementContext;
use App\Enums\Crm\SiteVisitStatus;
use App\Enums\Design\DesignJobStatus;
use App\Models\Account;
use App\Models\AccountDocument;
use App\Models\DesignJob;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\Leads\AccountProvisioningService;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use App\Services\Design\DesignDocumentBridgeService;
use App\Services\Media\FileStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class QuotationWorkspaceService
{
    public function __construct(
        protected QuotationCalculatorService $calculator,
        protected FileStorageService $files,
        protected AccountProvisioningService $accountProvisioning,
        protected DesignDocumentBridgeService $designBridge,
        protected QuotationAccountingExcelExtractionService $excel,
        protected FabricationExcelExtractionService $fabricationExcel,
        protected QuotationLineEnrichmentService $lineEnrichment,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listPending(?User $user = null): array
    {
        if ($user) {
            $this->reconcileAccountsForApprovedVisits($user);
        }

        $accountIds = $this->pendingAccountsQuery($user)->pluck('id');

        return $this->serializeQuotationAccounts($accountIds);
    }

    /**
     * Broader account list for the new-quotation form: includes design-ready accounts
     * even when a draft quotation already exists, so users can switch accounts.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listForQuotationForm(?User $user = null, ?int $includeAccountId = null, ?int $includeDesignJobId = null): array
    {
        if ($user) {
            $this->reconcileAccountsForApprovedVisits($user);
        }

        if (! $includeAccountId && $includeDesignJobId && Schema::hasTable('design_jobs')) {
            $designJob = DesignJob::query()->find($includeDesignJobId);
            if ($designJob) {
                $account = $this->designBridge->resolveAccountForDesignJob($designJob);
                if ($account) {
                    $includeAccountId = $account->id;
                }
            }
        }

        $accountIds = $this->quotationFormAccountsQuery($user)->pluck('id');

        if ($includeAccountId && ! $accountIds->contains($includeAccountId)) {
            $account = Account::query()->find($includeAccountId);
            if ($account && $this->userCanSelectAccount($user, $account)) {
                $accountIds->push($includeAccountId);
            }
        }

        return $this->serializeQuotationAccounts($accountIds);
    }

    /**
     * @param  Collection<int, int|string>  $accountIds
     * @return array<int, array<string, mixed>>
     */
    protected function serializeQuotationAccounts(Collection $accountIds): array
    {
        if ($accountIds->isEmpty()) {
            return [];
        }

        return Account::query()
            ->whereIn('id', $accountIds)
            ->with([
                'primaryContact',
                'sourceLead',
                'documents' => fn ($q) => $q->latest()->limit(3),
            ])
            ->withCount([
                'quotations as draft_quotations_count' => fn ($q) => $q->where('status', QuotationStatus::Draft->value),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Account $account) => $this->serializePendingAccount($account))
            ->all();
    }

    public function quotationFormAccountsQuery(?User $user = null): Builder
    {
        $eligibleAccountIds = $this->accountIdsEligibleForQuotation();

        $query = Account::query()->whereIn('id', $eligibleAccountIds);

        if ($user && ! $user->can('accounts.view_all')) {
            $visibleThroughVisits = $this->accountIdsVisibleThroughApprovedVisits($user);

            $query->where(function (Builder $inner) use ($user, $visibleThroughVisits): void {
                $inner->visibleTo($user);

                if ($visibleThroughVisits->isNotEmpty()) {
                    $inner->orWhereIn('id', $visibleThroughVisits);
                }
            });
        }

        return $query;
    }

    protected function userCanSelectAccount(?User $user, Account $account): bool
    {
        if (! $user) {
            return true;
        }

        if ($user->can('accounts.view_all')) {
            return true;
        }

        if ($this->accountIdsVisibleThroughApprovedVisits($user)->contains($account->id)) {
            return true;
        }

        return Account::query()
            ->whereKey($account->id)
            ->visibleTo($user)
            ->exists();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listDesignPending(?User $user = null): array
    {
        return collect($this->listPending($user))
            ->map(function (array $row) {
                $row['has_design_document'] = (bool) ($row['has_design_document'] ?? false);
                $row['has_accounting_document'] = (bool) ($row['has_accounting_document'] ?? false);

                return $row;
            })
            ->all();
    }

    public function pendingAccountsQuery(?User $user = null): Builder
    {
        $eligibleAccountIds = $this->accountIdsEligibleForQuotation();

        $quotedAccountIds = Quotation::query()
            ->whereIn('status', [
                QuotationStatus::Draft->value,
                QuotationStatus::Sent->value,
                QuotationStatus::Accepted->value,
                QuotationStatus::InternalReview->value,
            ])
            ->whereNotNull('account_id')
            ->pluck('account_id')
            ->unique();

        $query = Account::query()
            ->whereIn('id', $eligibleAccountIds)
            ->whereNotIn('id', $quotedAccountIds);

        if ($user && ! $user->can('accounts.view_all')) {
            $visibleThroughVisits = $this->accountIdsVisibleThroughApprovedVisits($user);

            $query->where(function (Builder $inner) use ($user, $visibleThroughVisits): void {
                $inner->visibleTo($user);

                if ($visibleThroughVisits->isNotEmpty()) {
                    $inner->orWhereIn('id', $visibleThroughVisits);
                }
            });
        }

        return $query;
    }

    /**
     * Accounts linked to approved quotation visits the user can access via site-visit visibility.
     *
     * @return Collection<int, int|string>
     */
    protected function accountIdsVisibleThroughApprovedVisits(User $user): Collection
    {
        $accountIds = collect();

        $visits = $this->approvedQuotationSiteVisitsQuery()
            ->visibleTo($user)
            ->get(['id', 'account_id', 'lead_id']);

        foreach ($visits as $visit) {
            if ($visit->account_id) {
                $accountIds->push($visit->account_id);
            }

            if ($visit->lead_id) {
                $lead = Lead::query()->find($visit->lead_id);
                if ($lead?->converted_account_id) {
                    $accountIds->push($lead->converted_account_id);
                }

                $sourceAccountId = Account::query()
                    ->where('source_lead_id', $visit->lead_id)
                    ->value('id');

                if ($sourceAccountId) {
                    $accountIds->push($sourceAccountId);
                }
            }
        }

        return $accountIds->filter()->unique()->values();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createFromPayload(
        Account $account,
        User $user,
        array $payload,
        ?UploadedFile $sourceFile = null,
        ?UploadedFile $fabricationFile = null,
    ): Quotation {
        $lines = $payload['lines'] ?? [];
        if ($lines === []) {
            throw ValidationException::withMessages([
                'lines' => ['At least one quotation line is required.'],
            ]);
        }

        return DB::transaction(function () use ($account, $user, $payload, $sourceFile, $fabricationFile, $lines) {
            $storedPath = null;
            if ($sourceFile) {
                $stored = $this->files->store($sourceFile, 'project-documents', 'quotation-'.$account->id);
                $storedPath = $stored['path'] ?? null;
            }

            $subtotal = 0.0;
            $totalQty = 0.0;
            $totalSqm = 0.0;
            $normalizedLines = [];

            foreach ($lines as $index => $line) {
                $quantity = (float) ($line['quantity'] ?? 1);
                $unitPrice = (float) ($line['unit_price'] ?? 0);
                $lineTotal = $quantity * $unitPrice;
                $subtotal += $lineTotal;
                $totalQty += $quantity;
                $totalSqm += (float) ($line['total_sqm'] ?? 0);

                $normalizedLines[] = array_filter([
                    'description' => $line['description'] ?? trim(($line['series'] ?? '').' '.($line['code'] ?? '')),
                    'series' => $line['series'] ?? null,
                    'code' => $line['code'] ?? null,
                    'glass_type' => $line['glass_type'] ?? null,
                    'width_mm' => $line['width_mm'] ?? null,
                    'height_mm' => $line['height_mm'] ?? null,
                    'sqm_per_pcs' => $line['sqm_per_pcs'] ?? null,
                    'total_sqm' => $line['total_sqm'] ?? null,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'metadata' => $line['metadata'] ?? null,
                    'sort_order' => $line['sort_order'] ?? $index,
                ], fn (mixed $value): bool => $value !== null);
            }

            $discount = (float) ($payload['discount_amount'] ?? 0);
            $taxRate = (float) ($payload['tax_rate'] ?? config('bibo.quotation.default_tax_rate', 16));
            $taxAmount = array_key_exists('tax_amount', $payload)
                ? (float) $payload['tax_amount']
                : round(max($subtotal - $discount, 0) * ($taxRate / 100), 2);
            $total = $subtotal - $discount + $taxAmount;

            $quotation = $this->calculator->createStructuredForAccount($account, $user, [
                'contact_id' => $payload['contact_id'] ?? null,
                'project_name' => $payload['project_name'] ?? $account->name,
                'project_number' => $payload['project_number'] ?? null,
                'valid_until' => $payload['valid_until'] ?? now()->addDays(7)->toDateString(),
                'terms_conditions' => $payload['terms_conditions'] ?? config('bibo.quotation.default_terms'),
                'discount_amount' => $discount,
                'tax_amount' => $taxAmount,
                'tax_rate' => $taxRate,
                'source_excel_path' => $storedPath,
                'lines' => $normalizedLines,
            ]);

            $designJob = $this->designBridge->completeDesignStageForQuotation(
                $account,
                $user,
                $fabricationFile,
                $sourceFile,
            );

            if ($designJob) {
                $quotation->update(['design_job_id' => $designJob->id]);
            }

            $this->designBridge->advanceLeadAfterProformaCreated($account, $user);

            return $quotation->fresh()->load(['lines', 'account', 'contact', 'preparedBy']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function extractMergedPayloadFromAccount(Account $account): array
    {
        $accountingDocument = $this->designBridge->latestAccountDocument($account, 'accounting');
        if (! $accountingDocument) {
            throw ValidationException::withMessages([
                'accounting' => ['No saved accounting document for this account. Upload costing in Design first.'],
            ]);
        }

        $designDocument = $this->designBridge->latestAccountDocument($account, 'design');
        if (! $designDocument) {
            throw ValidationException::withMessages([
                'design' => ['No saved fabrication document for this account. Upload WINCAD in Design first.'],
            ]);
        }

        $accountingFile = $this->designBridge->uploadedFileFromDocument($accountingDocument);
        if (! $accountingFile) {
            throw ValidationException::withMessages([
                'accounting' => ['Saved accounting document could not be read.'],
            ]);
        }

        $fabricationFile = $this->designBridge->uploadedFileFromDocument($designDocument);
        if (! $fabricationFile) {
            throw ValidationException::withMessages([
                'design' => ['Saved fabrication document could not be read.'],
            ]);
        }

        $payload = $this->excel->extractFromUpload($accountingFile);
        $fabricationPayload = $this->fabricationExcel->extractFromUpload($fabricationFile);

        return $this->lineEnrichment->enrich($payload, $fabricationPayload);
    }

    public function generateFromAccountDocuments(Account $account, User $user): Quotation
    {
        $existing = Quotation::query()
            ->excludingReferenceCopies()
            ->where('account_id', $account->id)
            ->whereIn('status', [
                QuotationStatus::Draft->value,
                QuotationStatus::InternalReview->value,
                QuotationStatus::Sent->value,
                QuotationStatus::Accepted->value,
            ])
            ->latest('id')
            ->first();

        if ($existing) {
            return $existing->load(['lines', 'account', 'contact', 'preparedBy']);
        }

        $payload = $this->extractMergedPayloadFromAccount($account);
        $lines = [];

        foreach ($payload['lines'] ?? [] as $index => $line) {
            if (! is_array($line)) {
                continue;
            }

            $lines[] = array_filter([
                'description' => $line['description'] ?? trim(($line['series'] ?? '').' '.($line['code'] ?? '')),
                'series' => $line['series'] ?? null,
                'code' => $line['code'] ?? null,
                'glass_type' => $line['glass_type'] ?? null,
                'width_mm' => $line['width_mm'] ?? null,
                'height_mm' => $line['height_mm'] ?? null,
                'sqm_per_pcs' => $line['sqm_per_pcs'] ?? null,
                'total_sqm' => $line['total_sqm'] ?? null,
                'quantity' => (float) ($line['quantity'] ?? 1),
                'unit_price' => (float) ($line['unit_price'] ?? 0),
                'metadata' => $line['metadata'] ?? null,
                'sort_order' => $index,
            ], fn (mixed $value): bool => $value !== null);
        }

        if ($lines === []) {
            throw ValidationException::withMessages([
                'lines' => ['No quotation lines could be extracted from saved documents.'],
            ]);
        }

        return $this->createFromPayload($account, $user, [
            'account_id' => $account->id,
            'project_name' => $payload['project']['name'] ?? $payload['project_name'] ?? $account->name,
            'project_number' => $payload['project']['order_no'] ?? $payload['project_number'] ?? null,
            'tax_rate' => config('bibo.quotation.default_tax_rate', 16),
            'lines' => $lines,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializePendingAccount(Account $account): array
    {
        $latestDesignJob = Schema::hasTable('design_jobs')
            ? DesignJob::query()
                ->where('status', DesignJobStatus::ReadyForQuotation->value)
                ->whereHas('lead', fn ($q) => $q->where('converted_account_id', $account->id)
                    ->orWhere('id', $account->source_lead_id))
                ->latest('approved_at')
                ->first()
            : null;

        $documents = AccountDocument::query()
            ->where('account_id', $account->id)
            ->get(['document_type']);

        $latestApprovedVisit = $this->approvedQuotationSiteVisitsQuery()
            ->where(function ($query) use ($account) {
                $query->where('account_id', $account->id);
                if ($account->source_lead_id) {
                    $query->orWhere('lead_id', $account->source_lead_id);
                }
            })
            ->latest('approved_at')
            ->first(['id', 'visit_number', 'approved_at']);

        $designDocument = $this->designBridge->latestAccountDocument($account, 'design');
        $accountingDocument = $this->designBridge->latestAccountDocument($account, 'accounting');
        $designJob = $this->designBridge->resolveDesignJobForAccount($account);

        $latestQuotation = Quotation::query()
            ->excludingReferenceCopies()
            ->where('account_id', $account->id)
            ->latest('id')
            ->first(['id', 'quotation_number', 'status', 'project_name', 'project_number', 'design_job_id']);

        return [
            'id' => $account->id,
            'name' => $account->name,
            'account_number' => $account->account_number,
            'status' => $account->status,
            'primary_contact' => $account->primaryContact ? [
                'id' => $account->primaryContact->id,
                'name' => $account->primaryContact->name,
            ] : null,
            'source_lead_id' => $account->source_lead_id,
            'latest_approved_visit' => $latestApprovedVisit ? [
                'id' => $latestApprovedVisit->id,
                'visit_number' => $latestApprovedVisit->visit_number,
                'approved_at' => $latestApprovedVisit->approved_at?->toIso8601String(),
            ] : null,
            'latest_design_job' => $latestDesignJob ? [
                'id' => $latestDesignJob->id,
                'design_job_number' => $latestDesignJob->design_job_number,
                'approved_at' => $latestDesignJob->approved_at?->toIso8601String(),
            ] : null,
            'has_design_document' => $documents->contains('document_type', 'design'),
            'has_accounting_document' => $documents->contains('document_type', 'accounting'),
            'design_document' => $designDocument ? [
                'id' => $designDocument->id,
                'filename' => $designDocument->filename,
            ] : null,
            'accounting_document' => $accountingDocument ? [
                'id' => $accountingDocument->id,
                'filename' => $accountingDocument->filename,
            ] : null,
            'latest_design_job_id' => $designJob?->id,
            'draft_quotations_count' => (int) ($account->draft_quotations_count ?? 0),
            'has_quotation' => $latestQuotation !== null,
            'latest_quotation' => $latestQuotation ? [
                'id' => $latestQuotation->id,
                'quotation_number' => $latestQuotation->quotation_number,
                'status' => $latestQuotation->status instanceof \BackedEnum
                    ? $latestQuotation->status->value
                    : (string) $latestQuotation->status,
                'project_name' => $latestQuotation->project_name,
                'project_number' => $latestQuotation->project_number,
                'design_job_id' => $latestQuotation->design_job_id,
            ] : null,
        ];
    }

    /**
     * @return Collection<int, int|string>
     */
    protected function eligibleLeadIdsFromDesignPipeline(): Collection
    {
        $leadIds = collect();

        if (Schema::hasTable('design_jobs')) {
            $leadIds = $leadIds->merge(
                DesignJob::query()
                    ->whereIn('status', [
                        DesignJobStatus::DesignRequired->value,
                        DesignJobStatus::Assigned->value,
                        DesignJobStatus::PackageDownloaded->value,
                        DesignJobStatus::WincadInProgress->value,
                        DesignJobStatus::FilesUploaded->value,
                        DesignJobStatus::DesignReview->value,
                        DesignJobStatus::Approved->value,
                        DesignJobStatus::ReadyForQuotation->value,
                    ])
                    ->whereNotNull('lead_id')
                    ->pluck('lead_id'),
            );
        }

        if (Schema::hasTable('quotation_requests')) {
            $leadIds = $leadIds->merge(
                QuotationRequest::query()
                    ->where('status', 'ready_for_quotation')
                    ->whereNotNull('lead_id')
                    ->pluck('lead_id'),
            );
        }

        return $leadIds->unique()->values();
    }

    /**
     * @return Collection<int, int|string>
     */
    protected function accountIdsEligibleForQuotation(): Collection
    {
        $approvedVisits = $this->approvedQuotationSiteVisitsQuery()
            ->get(['id', 'account_id', 'lead_id']);

        $accountIds = $approvedVisits->pluck('account_id')->filter()->values();

        $leadIds = $approvedVisits->pluck('lead_id')->filter()->unique()->values();

        if ($leadIds->isNotEmpty()) {
            $accountIds = $accountIds->merge(
                Lead::query()
                    ->whereIn('id', $leadIds)
                    ->whereNotNull('converted_account_id')
                    ->pluck('converted_account_id'),
            )->merge(
                Account::query()
                    ->whereIn('source_lead_id', $leadIds)
                    ->pluck('id'),
            );
        }

        $readyLeadIds = $this->eligibleLeadIdsFromDesignPipeline();

        if ($readyLeadIds->isNotEmpty()) {
            $accountIds = $accountIds->merge(
                Lead::query()
                    ->whereIn('id', $readyLeadIds)
                    ->whereNotNull('converted_account_id')
                    ->pluck('converted_account_id'),
            )->merge(
                Account::query()
                    ->whereIn('source_lead_id', $readyLeadIds)
                    ->pluck('id'),
            );
        }

        if (Schema::hasTable('account_documents')) {
            $accountIds = $accountIds->merge(
                AccountDocument::query()
                    ->where('document_type', 'design')
                    ->pluck('account_id'),
            );
        }

        $accountIds = $accountIds->merge(
            Account::query()
                ->where('status', 'awaiting_quotation')
                ->pluck('id'),
        );

        return $accountIds->unique()->values();
    }

    protected function approvedQuotationSiteVisitsQuery(): Builder
    {
        return SiteVisit::query()
            ->where('status', SiteVisitStatus::Approved->value)
            ->where(function ($query) {
                $query->where('measurement_context', MeasurementContext::Quotation->value)
                    ->orWhereNull('measurement_context');
            })
            ->where(function ($query) {
                $query->whereHas('measurementReports')
                    ->orWhereHas('measurementLines')
                    ->orWhereHas('designJobs')
                    ->orWhereNotNull('measurement_form_data');
            });
    }

    protected function reconcileAccountsForApprovedVisits(User $user): void
    {
        $approvedVisits = $this->approvedQuotationSiteVisitsQuery()
            ->whereNotNull('lead_id')
            ->get(['id', 'lead_id', 'account_id']);

        $leadIds = $approvedVisits
            ->whereNull('account_id')
            ->pluck('lead_id')
            ->unique()
            ->values();

        foreach ($leadIds as $leadId) {
            $lead = Lead::query()->find($leadId);
            if (! $lead) {
                continue;
            }

            $this->accountProvisioning->reconcileLeadAccount($lead, $user);
            $lead = $lead->fresh();

            if (! $lead->converted_account_id && $this->accountProvisioning->isEligibleForProvisioning($lead)) {
                try {
                    $this->accountProvisioning->provisionFromLead($lead, $user);
                    $lead = $lead->fresh();
                } catch (ValidationException) {
                    continue;
                }
            }

            if ($lead->converted_account_id) {
                SiteVisit::query()
                    ->where('lead_id', $lead->id)
                    ->whereNull('account_id')
                    ->update([
                        'account_id' => $lead->converted_account_id,
                        'contact_id' => $lead->converted_contact_id,
                    ]);

                Account::query()
                    ->whereKey($lead->converted_account_id)
                    ->where('status', '!=', 'awaiting_quotation')
                    ->update(['status' => 'awaiting_quotation']);
            }
        }

        $linkedAccountIds = $approvedVisits
            ->pluck('account_id')
            ->filter()
            ->unique()
            ->values();

        if ($linkedAccountIds->isNotEmpty()) {
            Account::query()
                ->whereIn('id', $linkedAccountIds)
                ->where('status', '!=', 'awaiting_quotation')
                ->update(['status' => 'awaiting_quotation']);
        }
    }
}
