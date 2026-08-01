<?php

namespace App\Http\Controllers;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Enums\Design\DesignJobStatus;
use App\Models\Deal;
use App\Models\DesignJob;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $leadQuery = Lead::query()->visibleTo($user);
        $visitQuery = SiteVisit::query()->visibleTo($user);

        $openLeads = (clone $leadQuery)
            ->where(function ($q) {
                $q->whereNull('pipeline_stage')
                    ->orWhereNotIn('pipeline_stage', LeadPipelineStage::terminalValues());
            })
            ->count();

        $siteVisitsToday = (clone $visitQuery)
            ->whereDate('visit_date', now()->toDateString())
            ->whereNotIn('status', [
                SiteVisitStatus::Cancelled->value,
                SiteVisitStatus::Approved->value,
            ])
            ->count();

        $measurementsSubmitted = (clone $visitQuery)
            ->where('status', SiteVisitStatus::SubmittedForReview->value)
            ->count();

        $designJobsPending = DesignJob::query()
            ->whereNotIn('status', [
                DesignJobStatus::ReadyForQuotation->value,
                DesignJobStatus::Approved->value,
            ])
            ->count();

        $readyForQuotation = DesignJob::query()
            ->where('status', DesignJobStatus::ReadyForQuotation->value)
            ->whereDoesntHave('quotations')
            ->count();

        $proformaSent = Quotation::query()
            ->excludingReferenceCopies()
            ->where('status', QuotationStatus::Sent->value)
            ->count();

        $awaitingDeposit = Quotation::query()
            ->excludingReferenceCopies()
            ->where('status', QuotationStatus::Accepted->value)
            ->count();

        $pipelineValue = (float) Quotation::query()
            ->excludingReferenceCopies()
            ->where('status', QuotationStatus::Sent->value)
            ->with('lines')
            ->get()
            ->sum(fn (Quotation $quotation): float => $quotation->totalAmountKes());

        $openDeals = Deal::query()
            ->visibleTo($user)
            ->where('status', 'open')
            ->count();

        return response()->json([
            'data' => [
                'open_leads' => $openLeads,
                'site_visits_today' => $siteVisitsToday,
                'measurements_submitted' => $measurementsSubmitted,
                'design_jobs_pending' => $designJobsPending,
                'ready_for_quotation' => $readyForQuotation,
                'proforma_quotations_sent' => $proformaSent,
                'awaiting_deposit' => $awaitingDeposit,
                'pipeline_value' => round($pipelineValue, 2),
                'open_deals' => $openDeals,
            ],
        ]);
    }
}
