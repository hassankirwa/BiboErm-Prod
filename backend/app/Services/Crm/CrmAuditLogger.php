<?php

namespace App\Services\Crm;

use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use Illuminate\Database\Eloquent\Model;

class CrmAuditLogger
{
    public function __construct(
        protected OwenAuditLogger $audit,
    ) {}

    public function leadStatusChanged(Lead $lead, ?array $oldValues, ?array $newValues, ?User $user = null): void
    {
        $this->logEntity('lead.status_changed', $lead, $oldValues, $newValues);
    }

    public function leadConverted(Lead $lead, ?array $newValues = null, ?User $user = null): void
    {
        $this->logEntity('lead.converted', $lead, null, $newValues ?? $lead->toArray());
    }

    public function dealStageChanged(Deal $deal, ?array $oldValues, ?array $newValues, ?User $user = null): void
    {
        $this->logEntity('deal.stage_changed', $deal, $oldValues, $newValues);
    }

    public function quotationSent(Quotation $quotation, ?User $user = null): void
    {
        $this->logEntity('quotation.sent', $quotation, null, $quotation->toArray());
    }

    public function dealPaymentRecorded(DealPayment $payment, ?User $user = null): void
    {
        $this->logEntity('deal.payment_recorded', $payment, null, $payment->toArray());
    }

    public function dealWon(Deal $deal, ?array $oldValues, ?array $newValues, ?User $user = null): void
    {
        $this->logEntity('deal.won', $deal, $oldValues, $newValues);
    }

    public function dealProjectCreated(Deal $deal, ?array $newValues = null, ?User $user = null): void
    {
        $this->logEntity('deal.project_created', $deal, null, $newValues ?? $deal->toArray());
    }

    public function siteVisitApproved(SiteVisit $visit, ?User $user = null): void
    {
        $this->logEntity('site_visit.approved', $visit, null, $visit->toArray());
    }

    protected function logEntity(string $action, Model $entity, ?array $oldValues, ?array $newValues): void
    {
        $this->audit->log(
            module: 'crm',
            action: $action,
            entityType: $entity->getMorphClass(),
            entityId: (int) $entity->getKey(),
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }
}
