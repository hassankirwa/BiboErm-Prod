<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrDocument;
use App\Models\LeaveRequest;
use App\Models\ProfileChangeRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class HrDashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $statusCounts = User::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $workforceStatuses = [
            User::STATUS_ACTIVE,
            User::STATUS_PENDING_HR_REVIEW,
            User::STATUS_PENDING_PROFILE_COMPLETION,
            User::STATUS_INVITED,
            User::STATUS_SUSPENDED,
            User::STATUS_INACTIVE,
        ];

        $totalEmployees = (int) $statusCounts->only($workforceStatuses)->sum();

        return response()->json([
            'total_employees' => $totalEmployees,
            'active' => (int) ($statusCounts[User::STATUS_ACTIVE] ?? 0),
            'pending_hr_review' => (int) ($statusCounts[User::STATUS_PENDING_HR_REVIEW] ?? 0),
            'pending_profile_completion' => (int) ($statusCounts[User::STATUS_PENDING_PROFILE_COMPLETION] ?? 0),
            'invited' => (int) ($statusCounts[User::STATUS_INVITED] ?? 0),
            'suspended' => (int) ($statusCounts[User::STATUS_SUSPENDED] ?? 0),
            'inactive' => (int) ($statusCounts[User::STATUS_INACTIVE] ?? 0),
            'profile_change_requests_pending' => ProfileChangeRequest::query()
                ->where('status', ProfileChangeRequest::STATUS_PENDING)
                ->count(),
            'leave_requests_pending' => LeaveRequest::query()
                ->where('status', LeaveRequest::STATUS_PENDING)
                ->count(),
            'total_documents' => HrDocument::query()->count(),
        ]);
    }

    public function pendingProfileChanges(): JsonResponse
    {
        $requests = ProfileChangeRequest::query()
            ->with('user:id,name,email')
            ->where('status', ProfileChangeRequest::STATUS_PENDING)
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (ProfileChangeRequest $request) => [
                'id' => $request->id,
                'user_id' => $request->user_id,
                'user_name' => $request->user?->name,
                'user_email' => $request->user?->email,
                'created_at' => $request->created_at?->toIso8601String(),
                'fields' => array_keys($request->requested_changes ?? []),
            ])
            ->values()
            ->all();

        return response()->json(['data' => $requests]);
    }
}
