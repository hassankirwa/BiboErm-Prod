<?php

namespace App\Services\Crm\Reports;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\QuotationStatus;
use App\Models\CrmActivity;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class CrmSalesReportService
{
    /** @var array<string, string> */
    private const DEAL_STAGE_LABELS = [
        'new_deal' => 'New Deal',
        'site_visit_pending' => 'Site Visit Pending',
        'measurements_completed' => 'Measurements Completed',
        'quotation_preparation' => 'Quotation Preparation',
        'quotation_sent' => 'Quotation Sent',
        'negotiation_revision' => 'Negotiation / Revision',
        'accepted' => 'Accepted',
        'deposit_pending' => 'Deposit Pending',
        'deposit_recorded' => 'Deposit Recorded',
        'won' => 'Won',
        'project_created' => 'Project Created',
        'lost' => 'Lost',
    ];

    /** @var array<string, string> */
    private const LEAD_STATUS_LABELS = [
        'new' => 'New',
        'contacted' => 'Contacted',
        'interested' => 'Interested',
        'not_reachable' => 'Not Reachable',
        'unqualified' => 'Unqualified',
        'qualified' => 'Qualified',
        'site_visit_required' => 'Site Visit Required',
        'site_visit_scheduled' => 'Site Visit Scheduled',
        'measurements_captured' => 'Measurements Captured',
        'converted' => 'Converted',
    ];

    /** @var array<string, string> */
    private const QUOTATION_STATUS_LABELS = [
        'draft' => 'Draft',
        'internal_review' => 'Internal Review',
        'sent' => 'Sent',
        'revision_requested' => 'Revision Requested',
        'revised' => 'Revised',
        'accepted' => 'Accepted',
        'rejected' => 'Rejected',
        'expired' => 'Expired',
    ];

    /**
     * @return array<string, mixed>
     */
    public function dashboard(User $user, ?string $from = null, ?string $to = null, ?int $ownerId = null): array
    {
        [$fromDate, $toDate] = $this->resolvePeriod($from, $to);

        $leadQuery = $this->scopedLeads($user, $ownerId);
        $dealQuery = $this->scopedDeals($user, $ownerId);
        $activityQuery = $this->scopedActivities($user, $ownerId);
        $quotationQuery = $this->scopedQuotations($user, $ownerId);
        $siteVisitQuery = $this->scopedSiteVisits($user, $ownerId);
        $paymentQuery = $this->scopedPayments($user, $ownerId);

        $periodLeadQuery = (clone $leadQuery)->whereBetween('leads.created_at', [$fromDate, $toDate]);
        $periodDealQuery = (clone $dealQuery)->whereBetween('deals.created_at', [$fromDate, $toDate]);

        $totalLeads = (clone $periodLeadQuery)->count();
        $convertedLeads = (clone $periodLeadQuery)->whereNotNull('leads.converted_at')->count();
        $openLeads = (clone $leadQuery)
            ->whereNull('leads.converted_at')
            ->whereBetween('leads.created_at', [$fromDate, $toDate])
            ->count();

        $openDeals = (clone $dealQuery)
            ->whereNotIn('stage', [DealStage::Won->value, DealStage::ProjectCreated->value, DealStage::Lost->value])
            ->count();

        $pipelineValue = (float) (clone $dealQuery)
            ->whereNotIn('stage', [DealStage::Won->value, DealStage::ProjectCreated->value, DealStage::Lost->value])
            ->selectRaw('COALESCE(SUM(COALESCE(final_agreed_amount, quotation_amount, estimated_value, amount, 0)), 0) as total')
            ->value('total');

        $wonDealsQuery = (clone $dealQuery)
            ->where(function (Builder $q) {
                $q->whereIn('stage', [DealStage::Won->value, DealStage::ProjectCreated->value])
                    ->orWhereNotNull('won_at');
            })
            ->where(function (Builder $q) use ($fromDate, $toDate) {
                $q->whereBetween('won_at', [$fromDate, $toDate])
                    ->orWhere(function (Builder $inner) use ($fromDate, $toDate) {
                        $inner->whereNull('won_at')
                            ->whereBetween('updated_at', [$fromDate, $toDate]);
                    });
            });

        $lostDealsQuery = (clone $dealQuery)
            ->where(function (Builder $q) {
                $q->where('stage', DealStage::Lost->value)
                    ->orWhereNotNull('lost_at');
            })
            ->where(function (Builder $q) use ($fromDate, $toDate) {
                $q->whereBetween('lost_at', [$fromDate, $toDate])
                    ->orWhere(function (Builder $inner) use ($fromDate, $toDate) {
                        $inner->whereNull('lost_at')
                            ->whereBetween('updated_at', [$fromDate, $toDate]);
                    });
            });

        $wonCount = (clone $wonDealsQuery)->count();
        $lostCount = (clone $lostDealsQuery)->count();
        $wonRevenue = (float) (clone $wonDealsQuery)
            ->selectRaw('COALESCE(SUM(COALESCE(final_agreed_amount, quotation_amount, estimated_value, amount, 0)), 0) as total')
            ->value('total');

        $closedCount = $wonCount + $lostCount;
        $winRate = $closedCount > 0 ? round(($wonCount / $closedCount) * 100, 1) : 0.0;
        $leadConversionRate = $totalLeads > 0 ? round(($convertedLeads / $totalLeads) * 100, 1) : 0.0;
        $avgDealSize = $wonCount > 0 ? round($wonRevenue / $wonCount, 2) : 0.0;

        $activitiesTotal = (clone $activityQuery)->whereBetween('crm_activities.created_at', [$fromDate, $toDate])->count();
        $activitiesCompleted = (clone $activityQuery)
            ->whereBetween('crm_activities.created_at', [$fromDate, $toDate])
            ->where(function (Builder $q) {
                $q->where('status', 'completed')
                    ->orWhereNotNull('completed_at');
            })
            ->count();

        $quotationsSent = (clone $quotationQuery)
            ->whereBetween('quotations.created_at', [$fromDate, $toDate])
            ->whereIn('status', [
                QuotationStatus::Sent->value,
                QuotationStatus::Accepted->value,
                QuotationStatus::RevisionRequested->value,
                QuotationStatus::Revised->value,
            ])
            ->count();

        $quotationsAccepted = (clone $quotationQuery)
            ->whereBetween('quotations.created_at', [$fromDate, $toDate])
            ->where('status', QuotationStatus::Accepted->value)
            ->count();

        $siteVisitsCount = (clone $siteVisitQuery)
            ->whereDate('visit_date', '>=', $fromDate)
            ->whereDate('visit_date', '<=', $toDate)
            ->count();

        $paymentsReceived = (float) (clone $paymentQuery)
            ->whereDate('payment_date', '>=', $fromDate)
            ->whereDate('payment_date', '<=', $toDate)
            ->sum('amount_paid');

        return [
            'period' => [
                'from' => $fromDate->toDateString(),
                'to' => $toDate->toDateString(),
            ],
            'filters' => [
                'owner_id' => $ownerId,
            ],
            'kpis' => [
                'total_leads' => $totalLeads,
                'open_leads' => $openLeads,
                'converted_leads' => $convertedLeads,
                'lead_conversion_rate' => $leadConversionRate,
                'open_deals' => $openDeals,
                'deals_created' => (clone $periodDealQuery)->count(),
                'pipeline_value' => round($pipelineValue, 2),
                'won_deals' => $wonCount,
                'lost_deals' => $lostCount,
                'won_revenue' => round($wonRevenue, 2),
                'win_rate' => $winRate,
                'avg_deal_size' => $avgDealSize,
                'quotations_sent' => $quotationsSent,
                'quotations_accepted' => $quotationsAccepted,
                'activities_total' => $activitiesTotal,
                'activities_completed' => $activitiesCompleted,
                'site_visits' => $siteVisitsCount,
                'payments_received' => round($paymentsReceived, 2),
            ],
            'pipeline_by_stage' => $this->pipelineByStage($dealQuery),
            'leads_by_status' => $this->leadsByStatus($periodLeadQuery),
            'leads_by_source' => $this->leadsBySource($periodLeadQuery),
            'activities_by_type' => $this->activitiesByType($activityQuery, $fromDate, $toDate),
            'quotations_by_status' => $this->quotationsByStatus($quotationQuery, $fromDate, $toDate),
            'top_performers' => $this->topPerformers($wonDealsQuery),
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolvePeriod(?string $from, ?string $to): array
    {
        $toDate = $to ? Carbon::parse($to)->endOfDay() : now()->endOfDay();
        $fromDate = $from ? Carbon::parse($from)->startOfDay() : now()->copy()->startOfMonth()->startOfDay();

        if ($fromDate->greaterThan($toDate)) {
            [$fromDate, $toDate] = [$toDate->copy()->startOfDay(), $fromDate->copy()->endOfDay()];
        }

        return [$fromDate, $toDate];
    }

    private function scopedLeads(User $user, ?int $ownerId): Builder
    {
        $query = Lead::query()->visibleTo($user);

        if ($ownerId) {
            $query->where(function (Builder $q) use ($ownerId) {
                $q->where('lead_owner_id', $ownerId)
                    ->orWhere('assigned_sales_user_id', $ownerId)
                    ->orWhere('assigned_to', $ownerId);
            });
        }

        return $query;
    }

    private function scopedDeals(User $user, ?int $ownerId): Builder
    {
        $query = Deal::query()->visibleTo($user);

        if ($ownerId) {
            $query->where(function (Builder $q) use ($ownerId) {
                $q->where('deal_owner_id', $ownerId)
                    ->orWhere('owner_id', $ownerId);
            });
        }

        return $query;
    }

    private function scopedActivities(User $user, ?int $ownerId): Builder
    {
        $query = CrmActivity::query();

        if (! $user->can('leads.view_all') && ! $user->can('deals.view_all')) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('assigned_to', $user->id)
                    ->orWhere('created_by', $user->id)
                    ->orWhereIn('lead_id', Lead::query()->visibleTo($user)->select('id'))
                    ->orWhereIn('deal_id', Deal::query()->visibleTo($user)->select('id'));
            });
        }

        if ($ownerId) {
            $query->where(function (Builder $q) use ($ownerId) {
                $q->where('assigned_to', $ownerId)
                    ->orWhere('created_by', $ownerId)
                    ->orWhereHas('lead', function (Builder $lead) use ($ownerId) {
                        $lead->where('lead_owner_id', $ownerId)
                            ->orWhere('assigned_sales_user_id', $ownerId);
                    })
                    ->orWhereHas('deal', function (Builder $deal) use ($ownerId) {
                        $deal->where('deal_owner_id', $ownerId)
                            ->orWhere('owner_id', $ownerId);
                    });
            });
        }

        return $query;
    }

    private function scopedQuotations(User $user, ?int $ownerId): Builder
    {
        $query = Quotation::query()->whereIn(
            'deal_id',
            Deal::query()->visibleTo($user)->select('id')
        );

        if ($ownerId) {
            $query->where(function (Builder $q) use ($ownerId) {
                $q->where('prepared_by', $ownerId)
                    ->orWhereIn('deal_id', Deal::query()->where(function (Builder $deal) use ($ownerId) {
                        $deal->where('deal_owner_id', $ownerId)
                            ->orWhere('owner_id', $ownerId);
                    })->select('id'));
            });
        }

        return $query;
    }

    private function scopedSiteVisits(User $user, ?int $ownerId): Builder
    {
        $query = SiteVisit::query()->visibleTo($user);

        if ($ownerId) {
            $query->where(function (Builder $q) use ($ownerId) {
                $q->where('assigned_field_officer_id', $ownerId)
                    ->orWhere('scheduled_by', $ownerId);
            });
        }

        return $query;
    }

    private function scopedPayments(User $user, ?int $ownerId): Builder
    {
        $query = DealPayment::query()
            ->whereIn('deal_id', Deal::query()->visibleTo($user)->select('deals.id'));

        if ($ownerId) {
            $query->whereIn('deal_id', function ($sub) use ($ownerId) {
                $sub->select('id')
                    ->from('deals')
                    ->where(function ($q) use ($ownerId) {
                        $q->where('deal_owner_id', $ownerId)
                            ->orWhere('owner_id', $ownerId);
                    });
            });
        }

        return $query;
    }

    /**
     * @return list<array{stage: string, label: string, count: int, value: float}>
     */
    private function pipelineByStage(Builder $dealQuery): array
    {
        $rows = (clone $dealQuery)
            ->whereNotIn('stage', [DealStage::Won->value, DealStage::ProjectCreated->value, DealStage::Lost->value])
            ->selectRaw("COALESCE(stage, 'unknown') as stage_key, COUNT(*) as cnt, COALESCE(SUM(COALESCE(final_agreed_amount, quotation_amount, estimated_value, amount, 0)), 0) as total_value")
            ->groupBy('stage_key')
            ->orderByDesc('total_value')
            ->get();

        return $rows->map(function ($row) {
            $stage = (string) $row->stage_key;

            return [
                'stage' => $stage,
                'label' => self::DEAL_STAGE_LABELS[$stage] ?? ucwords(str_replace('_', ' ', $stage)),
                'count' => (int) $row->cnt,
                'value' => round((float) $row->total_value, 2),
            ];
        })->values()->all();
    }

    /**
     * @return list<array{status: string, label: string, count: int}>
     */
    private function leadsByStatus(Builder $leadQuery): array
    {
        $rows = (clone $leadQuery)
            ->selectRaw("COALESCE(status, 'unknown') as status_key, COUNT(*) as cnt")
            ->groupBy('status_key')
            ->orderByDesc('cnt')
            ->get();

        return $rows->map(function ($row) {
            $status = (string) $row->status_key;

            return [
                'status' => $status,
                'label' => self::LEAD_STATUS_LABELS[$status] ?? ucwords(str_replace('_', ' ', $status)),
                'count' => (int) $row->cnt,
            ];
        })->values()->all();
    }

    /**
     * @return list<array{source: string, label: string, count: int}>
     */
    private function leadsBySource(Builder $leadQuery): array
    {
        $rows = (clone $leadQuery)
            ->leftJoin('crm_lead_sources', 'leads.lead_source_id', '=', 'crm_lead_sources.id')
            ->selectRaw("COALESCE(crm_lead_sources.label, leads.source, 'Unknown') as source_label, COUNT(leads.id) as cnt")
            ->groupBy('source_label')
            ->orderByDesc('cnt')
            ->get(['source_label', 'cnt']);

        return $rows->map(function ($row) {
            $label = (string) $row->source_label;

            return [
                'source' => $label,
                'label' => $label,
                'count' => (int) $row->cnt,
            ];
        })->values()->all();
    }

    /**
     * @return list<array{type: string, label: string, count: int}>
     */
    private function activitiesByType(Builder $activityQuery, Carbon $fromDate, Carbon $toDate): array
    {
        $rows = (clone $activityQuery)
            ->whereBetween('crm_activities.created_at', [$fromDate, $toDate])
            ->selectRaw("COALESCE(activity_type, type, 'other') as type_key, COUNT(*) as cnt")
            ->groupBy('type_key')
            ->orderByDesc('cnt')
            ->get();

        return $rows->map(function ($row) {
            $type = (string) $row->type_key;

            return [
                'type' => $type,
                'label' => ucwords(str_replace('_', ' ', $type)),
                'count' => (int) $row->cnt,
            ];
        })->values()->all();
    }

    /**
     * @return list<array{status: string, label: string, count: int, value: float}>
     */
    private function quotationsByStatus(Builder $quotationQuery, Carbon $fromDate, Carbon $toDate): array
    {
        $rows = (clone $quotationQuery)
            ->whereBetween('quotations.created_at', [$fromDate, $toDate])
            ->selectRaw("COALESCE(status, 'unknown') as status_key, COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total_value")
            ->groupBy('status_key')
            ->orderByDesc('cnt')
            ->get();

        return $rows->map(function ($row) {
            $status = (string) $row->status_key;

            return [
                'status' => $status,
                'label' => self::QUOTATION_STATUS_LABELS[$status] ?? ucwords(str_replace('_', ' ', $status)),
                'count' => (int) $row->cnt,
                'value' => round((float) $row->total_value, 2),
            ];
        })->values()->all();
    }

    /**
     * @return list<array{owner_id: int|null, name: string, won_deals: int, revenue: float}>
     */
    private function topPerformers(Builder $wonDealsQuery): array
    {
        $rows = (clone $wonDealsQuery)
            ->selectRaw('COALESCE(deal_owner_id, owner_id) as performer_id, COUNT(*) as won_count, COALESCE(SUM(COALESCE(final_agreed_amount, quotation_amount, estimated_value, amount, 0)), 0) as revenue')
            ->groupBy('performer_id')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        $userIds = $rows->pluck('performer_id')->filter()->unique()->values();
        $names = User::query()->whereIn('id', $userIds)->pluck('name', 'id');

        return $rows->map(function ($row) use ($names) {
            $ownerId = $row->performer_id ? (int) $row->performer_id : null;

            return [
                'owner_id' => $ownerId,
                'name' => $ownerId ? ($names[$ownerId] ?? 'Unknown') : 'Unassigned',
                'won_deals' => (int) $row->won_count,
                'revenue' => round((float) $row->revenue, 2),
            ];
        })->values()->all();
    }
}
