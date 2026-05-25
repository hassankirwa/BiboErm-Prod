<?php

namespace App\Http\Controllers\Crm\Reports;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\CrmActivity;
use App\Models\Deal;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CrmReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        $leadCount = Lead::query()->visibleTo($request->user())->count();
        $dealCount = Deal::query()->visibleTo($request->user())->count();
        $accountCount = Account::query()->count();
        $activityCount = CrmActivity::query()->count();

        $reports = [
            [
                'id' => 'leads-by-source',
                'name' => 'Leads by Source',
                'description' => 'Breakdown of leads grouped by lead source.',
                'folder' => 'Lead Reports',
                'record_count' => $leadCount,
            ],
            [
                'id' => 'sales-pipeline',
                'name' => 'Sales Pipeline Summary',
                'description' => 'Deals in each stage with total value.',
                'folder' => 'Sales Reports',
                'record_count' => $dealCount,
            ],
            [
                'id' => 'deals-closing-month',
                'name' => 'Deals Closing This Month',
                'description' => 'Deals expected to close within the current month.',
                'folder' => 'Sales Reports',
                'record_count' => Deal::query()
                    ->visibleTo($request->user())
                    ->whereBetween('expected_close_date', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count(),
            ],
            [
                'id' => 'activities-log',
                'name' => 'Activities Log',
                'description' => 'All CRM activities with status and due dates.',
                'folder' => 'Activity Reports',
                'record_count' => $activityCount,
            ],
            [
                'id' => 'accounts-list',
                'name' => 'Accounts List',
                'description' => 'All accounts with contact and industry details.',
                'folder' => 'Account Reports',
                'record_count' => $accountCount,
            ],
            [
                'id' => 'open-leads',
                'name' => 'Open Leads',
                'description' => 'Leads not yet converted, with owner and estimated value.',
                'folder' => 'Lead Reports',
                'record_count' => Lead::query()
                    ->visibleTo($request->user())
                    ->whereNull('converted_at')
                    ->count(),
            ],
        ];

        return response()->json(['data' => $reports]);
    }

    public function export(Request $request, string $report): StreamedResponse
    {
        $this->authorize('viewAny', Lead::class);

        $filename = "{$report}-".now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($request, $report) {
            $out = fopen('php://output', 'w');

            match ($report) {
                'leads-by-source' => $this->exportLeadsBySource($out, $request),
                'sales-pipeline' => $this->exportSalesPipeline($out, $request),
                'deals-closing-month' => $this->exportDealsClosingMonth($out, $request),
                'activities-log' => $this->exportActivitiesLog($out),
                'accounts-list' => $this->exportAccountsList($out),
                'open-leads' => $this->exportOpenLeads($out, $request),
                default => fputcsv($out, ['error'], ',', '"', ''),
            };

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /** @param resource $out */
    private function exportLeadsBySource($out, Request $request): void
    {
        fputcsv($out, ['Source', 'Lead Count'], ',', '"', '');

        $rows = Lead::query()
            ->visibleTo($request->user())
            ->selectRaw("COALESCE(source, 'Unknown') as src, COUNT(*) as cnt")
            ->groupBy('src')
            ->orderByDesc('cnt')
            ->get();

        foreach ($rows as $row) {
            fputcsv($out, [$row->src, $row->cnt], ',', '"', '');
        }
    }

    /** @param resource $out */
    private function exportSalesPipeline($out, Request $request): void
    {
        fputcsv($out, ['Deal', 'Stage', 'Amount', 'Expected Close', 'Owner ID'], ',', '"', '');

        Deal::query()
            ->visibleTo($request->user())
            ->orderBy('stage')
            ->chunk(200, function ($deals) use ($out) {
                foreach ($deals as $deal) {
                    fputcsv($out, [
                        $deal->title ?? $deal->name,
                        $deal->stage?->value ?? $deal->stage,
                        $deal->estimated_value ?? $deal->amount,
                        $deal->expected_close_date?->toDateString(),
                        $deal->deal_owner_id ?? $deal->owner_id,
                    ], ',', '"', '');
                }
            });
    }

    /** @param resource $out */
    private function exportDealsClosingMonth($out, Request $request): void
    {
        fputcsv($out, ['Deal', 'Stage', 'Amount', 'Expected Close'], ',', '"', '');

        Deal::query()
            ->visibleTo($request->user())
            ->whereBetween('expected_close_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->orderBy('expected_close_date')
            ->chunk(200, function ($deals) use ($out) {
                foreach ($deals as $deal) {
                    fputcsv($out, [
                        $deal->title ?? $deal->name,
                        $deal->stage?->value ?? $deal->stage,
                        $deal->estimated_value ?? $deal->amount,
                        $deal->expected_close_date?->toDateString(),
                    ], ',', '"', '');
                }
            });
    }

    /** @param resource $out */
    private function exportActivitiesLog($out): void
    {
        fputcsv($out, ['Subject', 'Type', 'Status', 'Due At', 'Lead ID', 'Deal ID'], ',', '"', '');

        CrmActivity::query()->latest()->chunk(500, function ($activities) use ($out) {
            foreach ($activities as $activity) {
                fputcsv($out, [
                    $activity->subject,
                    $activity->activity_type ?? $activity->type,
                    $activity->status,
                    $activity->due_at?->toIso8601String(),
                    $activity->lead_id,
                    $activity->deal_id,
                ], ',', '"', '');
            }
        });
    }

    /** @param resource $out */
    private function exportAccountsList($out): void
    {
        fputcsv($out, ['Account', 'Industry', 'Phone', 'Email', 'Created'], ',', '"', '');

        Account::query()->latest()->chunk(200, function ($accounts) use ($out) {
            foreach ($accounts as $account) {
                fputcsv($out, [
                    $account->name,
                    $account->industry,
                    $account->phone,
                    $account->email,
                    $account->created_at?->toDateString(),
                ], ',', '"', '');
            }
        });
    }

    /** @param resource $out */
    private function exportOpenLeads($out, Request $request): void
    {
        fputcsv($out, ['Lead', 'Status', 'Phone', 'Email', 'Estimated Value', 'Owner ID'], ',', '"', '');

        Lead::query()
            ->visibleTo($request->user())
            ->whereNull('converted_at')
            ->latest()
            ->chunk(200, function ($leads) use ($out) {
                foreach ($leads as $lead) {
                    fputcsv($out, [
                        $lead->name ?? $lead->contact_person_name,
                        $lead->status?->value ?? $lead->status,
                        $lead->phone,
                        $lead->email,
                        $lead->estimated_value ?? $lead->estimated_budget,
                        $lead->lead_owner_id,
                    ], ',', '"', '');
                }
            });
    }
}
