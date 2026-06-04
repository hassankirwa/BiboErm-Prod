<?php

namespace App\Http\Controllers\QualityControl;

use App\Enums\QualityControl\QcDefectStatus;
use App\Enums\QualityControl\QcInspectionResult;
use App\Http\Controllers\Controller;
use App\Http\Resources\QualityControl\QcDefectResource;
use App\Http\Resources\QualityControl\QcScheduleResource;
use App\Models\QualityControl\QcDefect;
use App\Models\QualityControl\QcInspection;
use App\Models\QualityControl\QcInspectionSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class QcDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('qc.view'), 403);

        $completed30d = QcInspection::query()
            ->whereIn('result', [
                QcInspectionResult::Pass,
                QcInspectionResult::Fail,
                QcInspectionResult::ConditionalPass,
            ])
            ->where('completed_at', '>=', now()->subDays(30));

        $total30d = (clone $completed30d)->count();
        $failed30d = (clone $completed30d)->where('result', QcInspectionResult::Fail)->count();
        $failRate30d = $total30d > 0 ? round(($failed30d / $total30d) * 100, 1) : 0.0;

        $inspectionsThisWeek = QcInspection::query()
            ->where('created_at', '>=', now()->startOfWeek())
            ->count();

        $openDefects = QcDefect::query()
            ->with([
                'inspection' => fn ($q) => $q->select('id', 'reference', 'context', 'project_id'),
                'inspection.project:id,reference,name',
            ])
            ->whereIn('status', [QcDefectStatus::Open, QcDefectStatus::InProgress])
            ->latest('id')
            ->limit(10)
            ->get();

        $dueSchedules = QcInspectionSchedule::query()
            ->with('template:id,name,context')
            ->where('is_active', true)
            ->where('next_due_at', '<=', now())
            ->orderBy('next_due_at')
            ->limit(10)
            ->get();

        $failRateTrend = $this->failRateTrend();

        return response()->json([
            'data' => [
                'open_defects_count' => QcDefect::query()
                    ->whereIn('status', [QcDefectStatus::Open, QcDefectStatus::InProgress])
                    ->count(),
                'due_schedules_count' => QcInspectionSchedule::query()
                    ->where('is_active', true)
                    ->where('next_due_at', '<=', now())
                    ->count(),
                'pending_inspections_count' => QcInspection::query()
                    ->where('result', QcInspectionResult::Pending)
                    ->count(),
                'fail_rate_30d' => $failRate30d,
                'fail_rate_percent' => $failRate30d,
                'inspections_this_week' => $inspectionsThisWeek,
                'open_defects' => QcDefectResource::collection($openDefects),
                'due_schedules' => QcScheduleResource::collection($dueSchedules),
                'fail_rate_trend' => $failRateTrend,
            ],
        ]);
    }

    /**
     * @return list<array{period: string, fail_rate: float}>
     */
    protected function failRateTrend(): array
    {
        $weeks = collect(range(3, 0))->map(function (int $weeksAgo) {
            $start = now()->startOfWeek()->subWeeks($weeksAgo);
            $end = $start->copy()->endOfWeek();

            $base = QcInspection::query()
                ->whereIn('result', [
                    QcInspectionResult::Pass,
                    QcInspectionResult::Fail,
                    QcInspectionResult::ConditionalPass,
                ])
                ->whereBetween('completed_at', [$start, $end]);

            $total = (clone $base)->count();
            $failed = (clone $base)->where('result', QcInspectionResult::Fail)->count();

            return [
                'period' => $start->format('M d'),
                'fail_rate' => $total > 0 ? round(($failed / $total) * 100, 1) : 0.0,
            ];
        });

        return $weeks->all();
    }
}
