<?php

namespace App\Services\Crm\Deals;

use App\Enums\Crm\DealStage;
use App\Models\Deal;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use Illuminate\Validation\ValidationException;

class DealStageService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
    ) {}

    public function updateStage(Deal $deal, string $stage, User $user): Deal
    {
        $current = $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage;

        if ($current === DealStage::Lost->value) {
            throw ValidationException::withMessages([
                'stage' => ['Lost deals cannot change stage.'],
            ]);
        }

        $oldValues = ['stage' => $current];

        $deal->update(['stage' => $stage]);

        if ($stage !== $current) {
            $this->crmAudit->dealStageChanged(
                $deal,
                $oldValues,
                ['stage' => $stage],
                $user,
            );
        }

        return $deal->fresh()->load(['contact', 'account', 'owner']);
    }

    public function markWon(Deal $deal, User $user, bool $overrideDeposit = false): Deal
    {
        $depositRequired = (float) ($deal->deposit_required_amount ?? $deal->deposit_amount ?? 0);
        $depositPaid = (float) ($deal->deposit_paid_amount ?? 0);

        if ($depositRequired > 0 && $depositPaid < $depositRequired && ! $overrideDeposit) {
            throw ValidationException::withMessages([
                'deposit' => ['Deposit must be recorded before marking deal as won.'],
            ]);
        }

        $oldValues = [
            'stage' => $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage,
            'status' => $deal->status,
        ];

        $deal->update([
            'stage' => DealStage::Won->value,
            'status' => 'won',
            'won_at' => now(),
        ]);

        $this->crmAudit->dealWon(
            $deal,
            $oldValues,
            ['stage' => DealStage::Won->value, 'status' => 'won'],
            $user,
        );

        return $deal->fresh()->load(['contact', 'account', 'owner']);
    }

    public function markLost(Deal $deal, User $user, array $data): Deal
    {
        $deal->update([
            'stage' => DealStage::Lost->value,
            'status' => 'lost',
            'lost_at' => now(),
            'loss_reason_id' => $data['loss_reason_id'] ?? null,
            'loss_notes' => $data['loss_notes'] ?? $data['lost_reason'] ?? null,
            'lost_reason' => $data['loss_notes'] ?? $data['lost_reason'] ?? null,
        ]);

        return $deal->fresh()->load(['contact', 'account', 'owner']);
    }
}
