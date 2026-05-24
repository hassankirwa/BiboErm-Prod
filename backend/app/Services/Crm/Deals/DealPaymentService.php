<?php

namespace App\Services\Crm\Deals;

use App\Enums\Crm\DealStage;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\User;
use App\Services\OwenAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DealPaymentService
{
    public function __construct(
        protected OwenAuditLogger $auditLogger,
        protected DealStageService $dealStageService,
    ) {}

    public function recordPayment(Deal $deal, array $data, User $user): DealPayment
    {
        if ($deal->stage === DealStage::Lost) {
            throw ValidationException::withMessages([
                'deal' => 'Cannot record payments on a lost deal.',
            ]);
        }

        return DB::transaction(function () use ($deal, $data, $user) {
            $payment = DealPayment::query()->create([
                'deal_id' => $deal->id,
                'quotation_id' => $data['quotation_id'] ?? null,
                'payment_reference' => $data['payment_reference'],
                'payment_date' => $data['payment_date'],
                'amount_paid' => $data['amount_paid'],
                'payment_method' => $data['payment_method'],
                'payment_status' => $data['payment_status'] ?? 'confirmed',
                'received_by' => $user->id,
                'proof_file_path' => $data['proof_file_path'] ?? null,
                'proof_firebase_url' => $data['proof_firebase_url'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncDealPaymentTotals($deal);

            $deal->refresh();

            if ($this->isDepositRequirementMet($deal)) {
                if (in_array($deal->stage, [DealStage::Accepted, DealStage::DepositPending], true)) {
                    $this->dealStageService->updateStage($deal, DealStage::DepositRecorded, $user);
                }
            }

            $this->auditLogger->log(
                module: 'crm',
                action: 'deal.payment_recorded',
                entity: $payment,
                newValues: $payment->toArray(),
                user: $user,
            );

            return $payment;
        });
    }

    public function syncDealPaymentTotals(Deal $deal): void
    {
        $totalPaid = (float) $deal->payments()->sum('amount_paid');
        $required = (float) ($deal->deposit_required_amount ?? 0);

        $paymentStatus = match (true) {
            $totalPaid <= 0 => 'not_paid',
            $required > 0 && $totalPaid >= $required => 'deposit_met',
            $required > 0 && $totalPaid < $required => 'partial',
            default => 'paid',
        };

        $deal->update([
            'deposit_paid_amount' => $totalPaid,
            'payment_status' => $paymentStatus,
        ]);
    }

    protected function isDepositRequirementMet(Deal $deal): bool
    {
        $required = (float) ($deal->deposit_required_amount ?? 0);
        $paid = (float) ($deal->deposit_paid_amount ?? 0);

        if ($required <= 0) {
            return $paid > 0;
        }

        return $paid >= $required;
    }
}
