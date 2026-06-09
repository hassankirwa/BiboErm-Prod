<?php

namespace App\Services\Hr;

use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class LeaveRequestService
{
    /**
     * @param  array{leave_type: string, start_date: string, end_date: string, reason?: string|null}  $data
     */
    public function submit(User $user, array $data): LeaveRequest
    {
        if ($user->status !== User::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'leave' => [__('Leave requests are only available for active accounts.')],
            ]);
        }

        $start = Carbon::parse($data['start_date'])->startOfDay();
        $end = Carbon::parse($data['end_date'])->startOfDay();

        if ($end->lt($start)) {
            throw ValidationException::withMessages([
                'end_date' => [__('End date must be on or after start date.')],
            ]);
        }

        if ($this->hasOverlappingRequest($user->id, $start, $end)) {
            throw ValidationException::withMessages([
                'start_date' => [__('You already have a pending or approved leave request that overlaps these dates.')],
            ]);
        }

        return LeaveRequest::query()->create([
            'user_id' => $user->id,
            'leave_type' => $data['leave_type'],
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'reason' => $data['reason'] ?? null,
            'status' => LeaveRequest::STATUS_PENDING,
        ]);
    }

    public function cancel(LeaveRequest $request, User $user): LeaveRequest
    {
        if ($request->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'leave' => [__('You can only cancel your own leave requests.')],
            ]);
        }

        if ($request->status !== LeaveRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'leave' => [__('Only pending leave requests can be cancelled.')],
            ]);
        }

        $request->update(['status' => LeaveRequest::STATUS_CANCELLED]);

        return $request->fresh(['user', 'reviewer']);
    }

    public function approve(LeaveRequest $request, User $reviewer): LeaveRequest
    {
        if ($request->status !== LeaveRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'leave' => [__('Only pending leave requests can be approved.')],
            ]);
        }

        $request->update([
            'status' => LeaveRequest::STATUS_APPROVED,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'rejection_reason' => null,
        ]);

        return $request->fresh(['user', 'reviewer']);
    }

    public function reject(LeaveRequest $request, User $reviewer, ?string $reason): LeaveRequest
    {
        if ($request->status !== LeaveRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'leave' => [__('Only pending leave requests can be rejected.')],
            ]);
        }

        $request->update([
            'status' => LeaveRequest::STATUS_REJECTED,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason,
        ]);

        return $request->fresh(['user', 'reviewer']);
    }

    private function hasOverlappingRequest(int $userId, Carbon $start, Carbon $end): bool
    {
        return LeaveRequest::query()
            ->where('user_id', $userId)
            ->whereIn('status', [LeaveRequest::STATUS_PENDING, LeaveRequest::STATUS_APPROVED])
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhereBetween('end_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhere(function ($inner) use ($start, $end) {
                        $inner->where('start_date', '<=', $start->toDateString())
                            ->where('end_date', '>=', $end->toDateString());
                    });
            })
            ->exists();
    }
}
