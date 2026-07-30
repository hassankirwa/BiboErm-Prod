<?php

namespace App\Services\Procurement\Glass;

use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\GlassPriceRecord;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class GlassPriceAnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?Carbon $from = null, ?Carbon $to = null): array
    {
        $from = $from?->copy()->startOfDay() ?? now()->subMonths(11)->startOfMonth();
        $to = $to?->copy()->endOfDay() ?? now()->endOfDay();

        $records = GlassPriceRecord::query()
            ->whereBetween('recorded_at', [$from, $to])
            ->with(['supplier:id,code,name', 'project:id,reference,name', 'glassOrder:id,order_number'])
            ->orderBy('recorded_at')
            ->get();

        $monthStart = now()->startOfMonth();
        $prevMonthStart = now()->subMonth()->startOfMonth();
        $prevMonthEnd = now()->subMonth()->endOfMonth();

        $thisMonthSpend = (float) GlassPriceRecord::query()
            ->whereBetween('recorded_at', [$monthStart, now()])
            ->sum('buying_price');

        $lastMonthSpend = (float) GlassPriceRecord::query()
            ->whereBetween('recorded_at', [$prevMonthStart, $prevMonthEnd])
            ->sum('buying_price');

        $spendChangePct = $lastMonthSpend > 0
            ? round((($thisMonthSpend - $lastMonthSpend) / $lastMonthSpend) * 100, 1)
            : null;

        return [
            'summary' => [
                'total_spend' => round((float) $records->sum('buying_price'), 2),
                'total_area_m2' => round((float) $records->sum('area_m2'), 4),
                'avg_price_per_sqm' => $this->weightedAvgPricePerSqm($records),
                'this_month_spend' => round($thisMonthSpend, 2),
                'last_month_spend' => round($lastMonthSpend, 2),
                'spend_change_pct' => $spendChangePct,
                'deliveries_count' => GlassOrder::query()
                    ->where('status', 'delivered')
                    ->whereBetween('delivered_at', [$from, $to])
                    ->count(),
                'records_count' => $records->count(),
                'currency' => 'KES',
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'monthly_spend' => $this->monthlySpend($from, $to),
            'price_by_type' => $this->priceByType($records),
            'price_trends' => $this->priceTrends($from, $to),
            'recent_records' => $records
                ->sortByDesc('recorded_at')
                ->take(25)
                ->values()
                ->map(fn (GlassPriceRecord $row) => [
                    'id' => $row->id,
                    'glass_order_id' => $row->glass_order_id,
                    'order_number' => $row->glassOrder?->order_number,
                    'project' => $row->project ? [
                        'id' => $row->project->id,
                        'reference' => $row->project->reference,
                        'name' => $row->project->name,
                    ] : null,
                    'supplier' => $row->supplier ? [
                        'id' => $row->supplier->id,
                        'code' => $row->supplier->code,
                        'name' => $row->supplier->name,
                    ] : null,
                    'pane_name' => $row->pane_name,
                    'glass_type' => $row->glass_type,
                    'tint' => $row->tint,
                    'width_mm' => $row->width_mm,
                    'height_mm' => $row->height_mm,
                    'quantity' => $row->quantity,
                    'area_m2' => $row->area_m2,
                    'buying_price' => $row->buying_price,
                    'price_per_sqm' => $row->price_per_sqm,
                    'currency' => $row->currency,
                    'recorded_at' => $row->recorded_at?->toIso8601String(),
                ])
                ->all(),
        ];
    }

    /**
     * @return list<array{month: string, label: string, spend: float, area_m2: float, avg_price_per_sqm: float|null}>
     */
    protected function monthlySpend(Carbon $from, Carbon $to): array
    {
        $cursor = $from->copy()->startOfMonth();
        $end = $to->copy()->startOfMonth();
        $rows = [];

        while ($cursor <= $end) {
            $monthKey = $cursor->format('Y-m');
            $monthFrom = $cursor->copy()->startOfMonth();
            $monthTo = $cursor->copy()->endOfMonth();

            $monthRecords = GlassPriceRecord::query()
                ->whereBetween('recorded_at', [$monthFrom, $monthTo])
                ->get(['buying_price', 'area_m2', 'price_per_sqm']);

            $spend = round((float) $monthRecords->sum('buying_price'), 2);
            $area = round((float) $monthRecords->sum('area_m2'), 4);

            $rows[] = [
                'month' => $monthKey,
                'label' => $cursor->format('M Y'),
                'spend' => $spend,
                'area_m2' => $area,
                'avg_price_per_sqm' => $this->weightedAvgPricePerSqm($monthRecords),
            ];

            $cursor->addMonth();
        }

        return $rows;
    }

    /**
     * @param  Collection<int, GlassPriceRecord>  $records
     * @return list<array{glass_type: string, records: int, total_spend: float, total_area_m2: float, avg_price_per_sqm: float|null, latest_price_per_sqm: float|null, previous_price_per_sqm: float|null, change_pct: float|null}>
     */
    protected function priceByType(Collection $records): array
    {
        return $records
            ->groupBy(fn (GlassPriceRecord $row) => trim((string) ($row->glass_type ?: 'Unspecified')) ?: 'Unspecified')
            ->map(function (Collection $group, string $type) {
                $sorted = $group->sortBy('recorded_at')->values();
                $latest = $sorted->last();
                $previous = $sorted->count() > 1 ? $sorted[$sorted->count() - 2] : null;
                $latestPrice = $latest?->price_per_sqm;
                $previousPrice = $previous?->price_per_sqm;
                $changePct = ($latestPrice !== null && $previousPrice !== null && (float) $previousPrice > 0)
                    ? round((((float) $latestPrice - (float) $previousPrice) / (float) $previousPrice) * 100, 1)
                    : null;

                return [
                    'glass_type' => $type,
                    'records' => $group->count(),
                    'total_spend' => round((float) $group->sum('buying_price'), 2),
                    'total_area_m2' => round((float) $group->sum('area_m2'), 4),
                    'avg_price_per_sqm' => $this->weightedAvgPricePerSqm($group),
                    'latest_price_per_sqm' => $latestPrice !== null ? round((float) $latestPrice, 4) : null,
                    'previous_price_per_sqm' => $previousPrice !== null ? round((float) $previousPrice, 4) : null,
                    'change_pct' => $changePct,
                ];
            })
            ->sortByDesc('total_spend')
            ->values()
            ->all();
    }

    /**
     * Monthly average price/m² per glass type for projection charts.
     *
     * @return list<array{month: string, label: string, glass_type: string, avg_price_per_sqm: float, area_m2: float}>
     */
    protected function priceTrends(Carbon $from, Carbon $to): array
    {
        $rows = GlassPriceRecord::query()
            ->whereBetween('recorded_at', [$from, $to])
            ->get(['glass_type', 'buying_price', 'area_m2', 'price_per_sqm', 'recorded_at']);

        return $rows
            ->groupBy(function (GlassPriceRecord $row) {
                $type = trim((string) ($row->glass_type ?: 'Unspecified')) ?: 'Unspecified';
                $month = $row->recorded_at?->format('Y-m') ?? 'unknown';

                return $month.'|'.$type;
            })
            ->map(function (Collection $group, string $key) {
                [$month, $type] = explode('|', $key, 2);
                $labelDate = Carbon::createFromFormat('Y-m', $month) ?: now();

                return [
                    'month' => $month,
                    'label' => $labelDate->format('M Y'),
                    'glass_type' => $type,
                    'avg_price_per_sqm' => $this->weightedAvgPricePerSqm($group) ?? 0.0,
                    'area_m2' => round((float) $group->sum('area_m2'), 4),
                ];
            })
            ->sortBy(['month', 'glass_type'])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, GlassPriceRecord>|Collection<int, object>  $records
     */
    protected function weightedAvgPricePerSqm(Collection $records): ?float
    {
        $area = (float) $records->sum(fn ($row) => (float) ($row->area_m2 ?? 0));
        $spend = (float) $records->sum(fn ($row) => (float) ($row->buying_price ?? 0));

        if ($area <= 0) {
            return null;
        }

        return round($spend / $area, 4);
    }
}
