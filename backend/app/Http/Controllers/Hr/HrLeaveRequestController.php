<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hr\RejectLeaveRequestRequest;
use App\Http\Resources\Hr\LeaveRequestResource;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\Hr\LeaveRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrLeaveRequestController extends Controller
{
    public function __construct(
        private readonly LeaveRequestService $leaveRequests,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $query = LeaveRequest::query()
            ->with(['user:id,name,email', 'reviewer:id,name'])
            ->latest('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($userId = $request->integer('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($from = $request->string('from')->toString()) {
            $query->whereDate('start_date', '>=', $from);
        }

        if ($to = $request->string('to')->toString()) {
            $query->whereDate('end_date', '<=', $to);
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => LeaveRequestResource::collection($paginated->items()),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    public function approve(LeaveRequest $leaveRequest): JsonResponse
    {
        /** @var User $reviewer */
        $reviewer = request()->user();

        $updated = $this->leaveRequests->approve($leaveRequest, $reviewer);

        return response()->json([
            'message' => __('Leave request approved.'),
            'data' => new LeaveRequestResource($updated),
        ]);
    }

    public function reject(LeaveRequest $leaveRequest, RejectLeaveRequestRequest $request): JsonResponse
    {
        /** @var User $reviewer */
        $reviewer = request()->user();

        $updated = $this->leaveRequests->reject(
            $leaveRequest,
            $reviewer,
            $request->validated('reason'),
        );

        return response()->json([
            'message' => __('Leave request rejected.'),
            'data' => new LeaveRequestResource($updated),
        ]);
    }
}
