<?php

namespace App\Http\Controllers;

use App\Http\Requests\Leave\SubmitLeaveRequestRequest;
use App\Http\Resources\Hr\LeaveRequestResource;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\Hr\LeaveBalanceService;
use App\Services\Hr\LeaveRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    public function __construct(
        private readonly LeaveRequestService $leaveRequests,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $requests = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->with(['user:id,name,email', 'reviewer:id,name'])
            ->latest('id')
            ->get();

        return response()->json([
            'data' => LeaveRequestResource::collection($requests)->resolve(),
            'balance' => app(LeaveBalanceService::class)->balanceFor($user),
        ]);
    }

    public function store(SubmitLeaveRequestRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $leaveRequest = $this->leaveRequests->submit($user, $request->validated());

        return response()->json([
            'message' => __('Leave request submitted for HR review.'),
            'data' => new LeaveRequestResource($leaveRequest->load(['user', 'reviewer'])),
        ], 201);
    }

    public function cancel(LeaveRequest $leaveRequest, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $updated = $this->leaveRequests->cancel($leaveRequest, $user);

        return response()->json([
            'message' => __('Leave request cancelled.'),
            'data' => new LeaveRequestResource($updated),
        ]);
    }
}
