<?php

namespace App\Services\Projects;

use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Account;
use App\Models\AccountDocument;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use App\Services\Media\FileStorageService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuotationWorkspaceService
{
    public function __construct(
        protected QuotationCalculatorService $calculator,
        protected FileStorageService $files,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listPending(?User $user = null): array
    {
        $accountIds = $this->pendingAccountsQuery($user)->pluck('id');

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
        $approvedAccountIds = SiteVisit::query()
            ->where('status', SiteVisitStatus::Approved->value)
            ->whereNotNull('account_id')
            ->pluck('account_id')
            ->unique()
            ->values();

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
            ->whereIn('id', $approvedAccountIds)
            ->whereNotIn('id', $quotedAccountIds);

        if ($user && ! $user->can('accounts.view_all')) {
            $query->visibleTo($user);
        }

        return $query;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createFromPayload(
        Account $account,
        User $user,
        array $payload,
        ?UploadedFile $sourceFile = null,
    ): Quotation {
        $lines = $payload['lines'] ?? [];
        if ($lines === []) {
            throw ValidationException::withMessages([
                'lines' => ['At least one quotation line is required.'],
            ]);
        }

        return DB::transaction(function () use ($account, $user, $payload, $sourceFile, $lines) {
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

            return $quotation->fresh()->load(['lines', 'account', 'contact', 'preparedBy']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializePendingAccount(Account $account): array
    {
        $latestVisit = SiteVisit::query()
            ->where('account_id', $account->id)
            ->where('status', SiteVisitStatus::Approved->value)
            ->latest('approved_at')
            ->first();

        $documents = AccountDocument::query()
            ->where('account_id', $account->id)
            ->get(['document_type']);

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
            'latest_approved_visit' => $latestVisit ? [
                'id' => $latestVisit->id,
                'visit_number' => $latestVisit->visit_number,
                'approved_at' => $latestVisit->approved_at?->toIso8601String(),
            ] : null,
            'has_design_document' => $documents->contains('document_type', 'design'),
            'has_accounting_document' => $documents->contains('document_type', 'accounting'),
            'draft_quotations_count' => (int) ($account->draft_quotations_count ?? 0),
        ];
    }
}
