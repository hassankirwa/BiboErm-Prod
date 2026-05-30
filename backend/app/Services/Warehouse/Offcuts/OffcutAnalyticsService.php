<?php

namespace App\Services\Warehouse\Offcuts;

use App\Enums\Warehouse\OffcutStatus;
use App\Models\Warehouse\OffcutPiece;
use Illuminate\Support\Carbon;

class OffcutAnalyticsService
{
    /**
     * @return array{
     *     period: array{from: string, to: string},
     *     summary: array{
     *         pieces_logged: int,
     *         pieces_consumed: int,
     *         pieces_available: int,
     *         total_length_mm_logged: int,
     *         total_length_mm_consumed: int,
     *         reuse_rate_percent: float
     *     },
     *     by_project: list<array{
     *         project_id: int,
     *         pieces_logged: int,
     *         pieces_consumed: int,
     *         total_length_mm_logged: int,
     *         reuse_rate_percent: float
     *     }>
     * }
     */
    public function report(?Carbon $from = null, ?Carbon $to = null): array
    {
        $from ??= now()->startOfMonth();
        $to ??= now()->endOfMonth();

        $logged = OffcutPiece::query()
            ->whereBetween('logged_at', [$from, $to])
            ->get();

        $consumed = $logged->where('status', OffcutStatus::Consumed);
        $available = OffcutPiece::query()
            ->where('status', OffcutStatus::Available)
            ->whereBetween('logged_at', [$from, $to])
            ->count();

        $loggedLength = $logged->sum(fn (OffcutPiece $piece) => $piece->length_mm * $piece->quantity_pieces);
        $consumedLength = $consumed->sum(fn (OffcutPiece $piece) => $piece->length_mm * $piece->quantity_pieces);

        $byProject = $logged
            ->filter(fn (OffcutPiece $piece) => $piece->source_project_id !== null)
            ->groupBy('source_project_id')
            ->map(function ($pieces, $projectId) {
                $projectConsumed = $pieces->where('status', OffcutStatus::Consumed);
                $projectLoggedLength = $pieces->sum(fn (OffcutPiece $p) => $p->length_mm * $p->quantity_pieces);
                $projectConsumedLength = $projectConsumed->sum(fn (OffcutPiece $p) => $p->length_mm * $p->quantity_pieces);

                return [
                    'project_id' => (int) $projectId,
                    'pieces_logged' => $pieces->count(),
                    'pieces_consumed' => $projectConsumed->count(),
                    'total_length_mm_logged' => $projectLoggedLength,
                    'reuse_rate_percent' => $this->reuseRate($pieces->count(), $projectConsumed->count()),
                ];
            })
            ->values()
            ->all();

        return [
            'period' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'summary' => [
                'pieces_logged' => $logged->count(),
                'pieces_consumed' => $consumed->count(),
                'pieces_available' => $available,
                'total_length_mm_logged' => $loggedLength,
                'total_length_mm_consumed' => $consumedLength,
                'reuse_rate_percent' => $this->reuseRate($logged->count(), $consumed->count()),
            ],
            'by_project' => $byProject,
        ];
    }

    protected function reuseRate(int $logged, int $consumed): float
    {
        if ($logged === 0) {
            return 0.0;
        }

        return round(($consumed / $logged) * 100, 2);
    }
}
