<?php

namespace App\Services\Crm\Leads;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Account;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Crm\Deals\DealFromQuotationService;
use App\Services\Crm\Deals\DealStageService;
use App\Services\Crm\Payments\DealPaymentService;
use App\Services\Crm\Quotations\QuotationCalculatorService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lead conversion — v2:
 * - Without account: provision account + contact (legacy manual path).
 * - With account: create deal (from quotation when present) and record deposit.
 */
class LeadConversionService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected AccountProvisioningService $accountProvisioning,
        protected LeadSalesContextService $salesContext,
        protected DealFromQuotationService $dealFromQuotation,
        protected DealStageService $dealStageService,
        protected DealPaymentService $dealPaymentService,
        protected QuotationCalculatorService $quotationCalculator,
    ) {}

    public function convert(Lead $lead, User $user, array $data): array
    {
        if ($lead->converted_account_id) {
            return $this->convertWithDeposit($lead, $user, $data);
        }

        return $this->provisionAccount($lead, $user, $data);
    }

    protected function provisionAccount(Lead $lead, User $user, array $data): array
    {
        $status = $lead->status instanceof LeadStatus ? $lead->status->value : $lead->status;

        $allowed = [
            LeadStatus::Interested->value,
            LeadStatus::AccountCreated->value,
            LeadStatus::Qualified->value,
            LeadStatus::SiteVisitScheduled->value,
            LeadStatus::MeasurementsCaptured->value,
        ];

        if (! in_array($status, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => ['Lead cannot be converted in its current status.'],
            ]);
        }

        if ($data['create_deal'] ?? false) {
            throw ValidationException::withMessages([
                'create_deal' => ['Deals are created automatically when a quotation is sent.'],
            ]);
        }

        $result = $this->accountProvisioning->provisionFromLead($lead, $user);

        $this->crmAudit->leadConverted($lead, [
            'contact_id' => $result['contact']?->id,
            'account_id' => $result['account']?->id,
            'deal_id' => null,
        ], $user);

        return [
            'lead' => $result['lead'],
            'account' => $result['account'],
            'contact' => $result['contact'],
            'deal' => null,
            'payment' => null,
        ];
    }

    protected function convertWithDeposit(Lead $lead, User $user, array $data): array
    {
        $this->assertPaymentPayload($data);

        return DB::transaction(function () use ($lead, $user, $data) {
            $account = Account::query()->findOrFail($lead->converted_account_id);
            $this->assertCommercialReadiness($lead, $account, $data['quotation_id'] ?? null);
            $quotation = $this->resolveQuotation($account->id, $data['quotation_id'] ?? null);
            $deal = $this->resolveDeal($lead, $account, $quotation, $user);

            if (! $deal->deposit_required_amount && ! $deal->deposit_amount) {
                $deal->update(['deposit_required_amount' => $data['amount_paid']]);
                $deal = $deal->fresh();
            }

            if ($quotation) {
                $quotation = $this->acceptQuotationIfNeeded($quotation);
                $deal = $this->markDealWonIfNeeded($deal->fresh(), $user);
            }

            $payment = $this->dealPaymentService->record($deal, $user, [
                'payment_reference' => $data['payment_reference'],
                'payment_date' => $data['payment_date'],
                'amount_paid' => $data['amount_paid'],
                'payment_method' => $data['payment_method'],
                'payment_status' => $data['payment_status'] ?? 'confirmed',
                'quotation_id' => $quotation?->id,
                'notes' => $data['notes'] ?? null,
            ]);

            $lead->update([
                'converted_deal_id' => $deal->id,
                'converted_at' => $lead->converted_at ?? now(),
            ]);

            $this->salesContext->reconcileLeadDealLink($lead->fresh());

            $this->crmAudit->leadConverted($lead->fresh(), [
                'account_id' => $account->id,
                'deal_id' => $deal->id,
                'payment_id' => $payment->id,
            ], $user);

            return [
                'lead' => $lead->fresh(),
                'account' => $account->fresh(),
                'contact' => $lead->convertedContact,
                'deal' => $deal->fresh()->load(['contact', 'account', 'owner']),
                'payment' => $payment,
            ];
        });
    }

    protected function assertCommercialReadiness(Lead $lead, Account $account, mixed $quotationId): void
    {
        $hasApprovedVisit = SiteVisit::query()
            ->where(function ($query) use ($lead, $account) {
                $query->where('lead_id', $lead->id)
                    ->orWhere('account_id', $account->id);
            })
            ->where('status', SiteVisitStatus::Approved->value)
            ->exists();

        if (! $hasApprovedVisit) {
            throw ValidationException::withMessages([
                'status' => ['An approved site visit with measurements is required before recording a deposit.'],
            ]);
        }

        $quotationQuery = Quotation::query()
            ->where('account_id', $account->id)
            ->excludingReferenceCopies();

        if ($quotationId) {
            $quotationQuery->whereKey($quotationId);
        }

        $quotation = $quotationQuery->latest('id')->first();

        $sentStatuses = [
            QuotationStatus::Sent,
            QuotationStatus::RevisionRequested,
            QuotationStatus::Revised,
            QuotationStatus::Accepted,
        ];

        $status = $quotation?->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) ($quotation?->status ?? ''));

        if (! $quotation || ! in_array($status, $sentStatuses, true)) {
            throw ValidationException::withMessages([
                'quotation_id' => ['A quotation must be sent to the client before recording a deposit.'],
            ]);
        }
    }

    protected function assertPaymentPayload(array $data): void
    {
        $errors = [];

        foreach (['payment_reference', 'payment_date', 'payment_method'] as $field) {
            if (! array_key_exists($field, $data) || $data[$field] === null || $data[$field] === '') {
                $errors[$field] = ["The {$field} field is required when converting a lead with an account."];
            }
        }

        if (! array_key_exists('amount_paid', $data) || $data['amount_paid'] === null || $data['amount_paid'] === '') {
            $errors['amount_paid'] = ['The amount_paid field is required when converting a lead with an account.'];
        } elseif ((float) $data['amount_paid'] <= 0) {
            $errors['amount_paid'] = ['Deposit amount must be greater than zero.'];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    protected function resolveQuotation(int $accountId, mixed $quotationId): ?Quotation
    {
        if ($quotationId) {
            $quotation = Quotation::query()
                ->where('account_id', $accountId)
                ->whereKey($quotationId)
                ->excludingReferenceCopies()
                ->first();

            if (! $quotation) {
                throw ValidationException::withMessages([
                    'quotation_id' => ['Quotation not found on this account.'],
                ]);
            }

            return $quotation;
        }

        return Quotation::query()
            ->where('account_id', $accountId)
            ->excludingReferenceCopies()
            ->latest('id')
            ->first();
    }

    protected function resolveDeal(Lead $lead, Account $account, ?Quotation $quotation, User $user): Deal
    {
        if ($lead->converted_deal_id) {
            $existing = Deal::query()->find($lead->converted_deal_id);
            if ($existing) {
                return $existing;
            }
        }

        if ($quotation) {
            if ($quotation->deal_id) {
                return Deal::query()->findOrFail($quotation->deal_id);
            }

            $status = $quotation->status instanceof QuotationStatus
                ? $quotation->status
                : QuotationStatus::tryFrom((string) $quotation->status);

            if (in_array($status, [QuotationStatus::Draft, QuotationStatus::Revised], true)) {
                $quotation = $this->quotationCalculator->send($quotation, $user);

                return Deal::query()->findOrFail($quotation->deal_id);
            }

            return $this->dealFromQuotation->createFromQuotation($quotation, $user);
        }

        $existingDeal = Deal::query()
            ->where('account_id', $account->id)
            ->latest('id')
            ->first();

        if ($existingDeal) {
            return $existingDeal;
        }

        $title = $account->name.' — Opportunity';

        return Deal::query()->create([
            'reference' => 'DL-'.strtoupper(Str::random(8)),
            'deal_number' => 'DL-'.strtoupper(Str::random(8)),
            'title' => $title,
            'name' => $title,
            'account_id' => $account->id,
            'contact_id' => $account->primary_contact_id,
            'primary_contact_id' => $account->primary_contact_id,
            'source_lead_id' => $lead->id,
            'stage' => DealStage::QuotationSent->value,
            'status' => 'open',
            'owner_id' => $account->account_owner_id ?? $user->id,
            'deal_owner_id' => $account->account_owner_id ?? $user->id,
            'created_by' => $user->id,
        ]);
    }

    protected function acceptQuotationIfNeeded(Quotation $quotation): Quotation
    {
        $status = $quotation->status instanceof QuotationStatus
            ? $quotation->status
            : QuotationStatus::tryFrom((string) $quotation->status);

        if ($status === QuotationStatus::Accepted) {
            return $quotation;
        }

        return $this->quotationCalculator->accept($quotation);
    }

    protected function markDealWonIfNeeded(Deal $deal, User $user): Deal
    {
        $stage = $deal->stage instanceof DealStage ? $deal->stage : DealStage::tryFrom((string) $deal->stage);

        if ($stage === DealStage::Won || $deal->status === 'won') {
            return $deal;
        }

        return $this->dealStageService->markWon($deal, $user);
    }
}
