<?php

namespace App\Services\Crm\Payments;

use App\Enums\Crm\DealStage;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Support\Facades\DB;

class DealPaymentService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function record(Deal $deal, User $user, array $data): DealPayment
    {
        return DB::transaction(function () use ($deal, $user, $data) {
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

            $totalPaid = (float) DealPayment::query()
                ->where('deal_id', $deal->id)
                ->sum('amount_paid');

            $depositRequired = (float) ($deal->deposit_required_amount ?? $deal->deposit_amount ?? 0);
            $paymentStatus = $totalPaid <= 0 ? 'not_paid' : ($totalPaid >= $depositRequired && $depositRequired > 0 ? 'deposit_met' : 'partial');

            $updates = [
                'deposit_paid_amount' => $totalPaid,
                'deposit_amount' => $totalPaid,
                'payment_status' => $paymentStatus,
            ];

            if ($depositRequired > 0 && $totalPaid >= $depositRequired) {
                $updates['stage'] = DealStage::DepositRecorded->value;
            } else {
                $updates['stage'] = DealStage::DepositPending->value;
            }

            $deal->update($updates);

            $this->crmAudit->dealPaymentRecorded($payment, $user);

            return $payment->load(['deal', 'receivedBy']);
        });
    }
}
