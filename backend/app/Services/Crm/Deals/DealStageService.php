<?php

namespace App\Services\Crm\Deals;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Deal;
use App\Models\User;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Crm\Leads\LeadPipelineService;
use Illuminate\Validation\ValidationException;

class DealStageService
{
    public function __construct(
        protected CrmAuditLogger $crmAudit,
        protected LeadPipelineService $leadPipeline,
    ) {}

    public function updateStage(Deal $deal, string $stage, User $user): Deal
    {
        $current = $deal->stage instanceof DealStage ? $deal->stage->value : (string) $deal->stage;

        if ($current === DealStage::Lost->value) {
            throw ValidationException::withMessages([
                'stage' => ['Lost deals cannot change stage.'],
            ]);
        }

        $this->assertCanTransitionTo($deal, $stage);

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
        $hasAcceptedQuotation = $deal->quotations()
            ->where('status', QuotationStatus::Accepted->value)
            ->exists();

        if (! $hasAcceptedQuotation) {
            throw ValidationException::withMessages([
                'quotation' => ['An accepted quotation is required before marking the deal as won.'],
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

        $this->leadPipeline->syncFromDeal($deal->fresh(), $user);

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

    protected function assertCanTransitionTo(Deal $deal, string $targetStage): void
    {
        $target = DealStage::tryFrom($targetStage);

        if ($target === null) {
            throw ValidationException::withMessages([
                'stage' => ['Invalid deal stage.'],
            ]);
        }

        match ($target) {
            DealStage::MeasurementsCompleted => $this->assertApprovedSiteVisit($deal),
            DealStage::QuotationSent => $this->assertQuotationWithStatuses(
                $deal,
                [QuotationStatus::Sent, QuotationStatus::Accepted],
                'A sent quotation is required before moving to quotation sent.',
            ),
            DealStage::Accepted => $this->assertQuotationWithStatuses(
                $deal,
                [QuotationStatus::Accepted],
                'An accepted quotation is required before moving to accepted.',
            ),
            DealStage::DepositRecorded => $this->assertDepositMet($deal),
            DealStage::Won => throw ValidationException::withMessages([
                'stage' => ['Use the mark-won endpoint to set deal stage to won.'],
            ]),
            DealStage::ProjectCreated => throw ValidationException::withMessages([
                'stage' => ['Use the create-project endpoint to set deal stage to project created.'],
            ]),
            default => null,
        };
    }

    protected function assertApprovedSiteVisit(Deal $deal): void
    {
        $hasApproved = $deal->siteVisits()
            ->where('status', SiteVisitStatus::Approved->value)
            ->exists();

        if (! $hasApproved) {
            throw ValidationException::withMessages([
                'stage' => ['An approved site visit is required before measurements completed.'],
            ]);
        }
    }

    /**
     * @param  list<QuotationStatus>  $statuses
     */
    protected function assertQuotationWithStatuses(Deal $deal, array $statuses, string $message): void
    {
        $values = array_map(fn (QuotationStatus $s) => $s->value, $statuses);

        $hasQuotation = $deal->quotations()
            ->whereIn('status', $values)
            ->exists();

        if (! $hasQuotation) {
            throw ValidationException::withMessages([
                'stage' => [$message],
            ]);
        }
    }

    protected function assertDepositMet(Deal $deal): void
    {
        $required = (float) ($deal->deposit_required_amount ?? $deal->deposit_amount ?? 0);
        $paid = (float) ($deal->deposit_paid_amount ?? 0);

        if ($required > 0 && $paid < $required) {
            throw ValidationException::withMessages([
                'stage' => ['Recorded payments must meet the deposit requirement.'],
            ]);
        }

        if ($required <= 0 && $paid <= 0) {
            throw ValidationException::withMessages([
                'stage' => ['At least one payment must be recorded.'],
            ]);
        }
    }
}
