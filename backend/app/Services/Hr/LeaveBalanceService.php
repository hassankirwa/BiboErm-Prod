<?php

namespace App\Services\Hr;

use App\Models\LeaveRequest;
use App\Models\PayrollSetting;
use App\Models\User;
use Carbon\Carbon;

class LeaveBalanceService
{
    /**
     * Inclusive calendar days between start and end (same day = 1).
     */
    public function daysBetween(Carbon|string $start, Carbon|string $end): int
    {
        $startDate = Carbon::parse($start)->startOfDay();
        $endDate = Carbon::parse($end)->startOfDay();

        return (int) max(1, $startDate->diffInDays($endDate) + 1);
    }

    /**
     * @return array{
     *     year: int,
     *     entitlement: int,
     *     used: int,
     *     pending: int,
     *     remaining: int,
     *     available: int
     * }
     */
    public function balanceFor(User $user, ?int $year = null): array
    {
        $year ??= (int) now()->year;
        $entitlement = (int) PayrollSetting::current()->annual_leave_days;

        $used = $this->sumDays($user->id, $year, [LeaveRequest::STATUS_APPROVED]);
        $pending = $this->sumDays($user->id, $year, [LeaveRequest::STATUS_PENDING]);
        $remaining = max(0, $entitlement - $used);
        $available = max(0, $entitlement - $used - $pending);

        return [
            'year' => $year,
            'entitlement' => $entitlement,
            'used' => $used,
            'pending' => $pending,
            'remaining' => $remaining,
            'available' => $available,
        ];
    }

    /**
     * @param  list<string>  $statuses
     */
    private function sumDays(int $userId, int $year, array $statuses): int
    {
        $requests = LeaveRequest::query()
            ->where('user_id', $userId)
            ->where('leave_type', LeaveRequest::TYPE_ANNUAL)
            ->whereIn('status', $statuses)
            ->whereYear('start_date', $year)
            ->get(['start_date', 'end_date', 'days']);

        return (int) $requests->sum(function (LeaveRequest $request) {
            if ($request->days !== null) {
                return (int) $request->days;
            }

            return $this->daysBetween($request->start_date, $request->end_date);
        });
    }
}
