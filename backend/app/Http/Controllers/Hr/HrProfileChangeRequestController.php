<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hr\RejectProfileChangeRequestRequest;
use App\Models\ProfileChangeRequest;
use App\Models\User;
use App\Services\Profile\ProfileChangeRequestService;
use Illuminate\Http\JsonResponse;

class HrProfileChangeRequestController extends Controller
{
    public function __construct(
        private readonly ProfileChangeRequestService $requests,
    ) {}

    public function approve(ProfileChangeRequest $profileChangeRequest): JsonResponse
    {
        /** @var User $reviewer */
        $reviewer = request()->user();

        $updated = $this->requests->approve($profileChangeRequest, $reviewer);

        return response()->json([
            'message' => __('Profile changes approved and applied.'),
            'change_request' => ProfileChangeRequestService::serialize($updated),
        ]);
    }

    public function reject(
        ProfileChangeRequest $profileChangeRequest,
        RejectProfileChangeRequestRequest $request,
    ): JsonResponse {
        /** @var User $reviewer */
        $reviewer = request()->user();

        $updated = $this->requests->reject(
            $profileChangeRequest,
            $reviewer,
            $request->validated('reason'),
        );

        return response()->json([
            'message' => __('Profile change request rejected.'),
            'change_request' => ProfileChangeRequestService::serialize($updated),
        ]);
    }
}
