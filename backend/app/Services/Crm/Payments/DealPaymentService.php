<?php

namespace App\Services\Crm\Payments;

use App\Enums\Crm\DealStage;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\Project;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Crm\Deals\DealToProjectService;
use App\Services\Crm\Leads\LeadPipelineService;
use App\Services\Projects\ProjectActivationService;
use App\Services\Projects\ProjectDealSyncService;
use Illuminate\Support\Facades\DB;

class DealPaymentService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected ProjectDealSyncService $projectDealSync,
        protected ProjectActivationService $projectActivation,
        protected DealToProjectService $dealToProject,
        protected LeadPipelineService $leadPipeline,
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
            if ($totalPaid <= 0) {
                $paymentStatus = 'not_paid';
            } elseif ($depositRequired <= 0 || $totalPaid >= $depositRequired) {
                $paymentStatus = 'deposit_met';
            } else {
                $paymentStatus = 'partial';
            }

            $updates = [
                'deposit_paid_amount' => $totalPaid,
                'deposit_amount' => $totalPaid,
                'payment_status' => $paymentStatus,
            ];

            $deal->update($updates);
            $deal = $deal->fresh();

            if ($deal->project_id) {
                $project = Project::query()->find($deal->project_id);
                if ($project) {
                    $project = $this->projectActivation->tryActivateFromDeposit($project, $deal, $user);
                    $this->projectDealSync->syncFromDeal($project, $user);
                }
            } elseif ($this->shouldCreateProjectFromDeposit($deal)) {
                $this->dealToProject->createFromDeal($deal, $user);
                $deal = $deal->fresh();
            }

            $this->crmAudit->dealPaymentRecorded($payment, $user);

            $this->leadPipeline->syncFromDeal($deal->fresh(), $user);

            return $payment->load(['deal', 'receivedBy']);
        });
    }

    protected function shouldCreateProjectFromDeposit(Deal $deal): bool
    {
        if ($deal->project_id) {
            return false;
        }

        if (! $this->projectDealSync->dealDepositSatisfied($deal)) {
            return false;
        }

        $stage = $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage;

        return $stage === DealStage::Won->value || $deal->status === 'won';
    }
}
