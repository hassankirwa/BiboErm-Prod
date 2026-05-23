<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\InviteUserRequest;
use App\Models\User;
use App\Services\Auth\InvitationService;
use Illuminate\Http\JsonResponse;

class InviteUserController extends Controller
{
    public function store(InviteUserRequest $request, InvitationService $invitations): JsonResponse
    {
        $data = $request->validated();

        /** @var User $actor */
        $actor = $request->user();

        $created = $invitations->createInvitation(
            email: $data['email'],
            name: $data['name'] ?? null,
            departmentId: (int) $data['department_id'],
            roleId: (int) $data['role_id'],
            additionalAssignments: $data['additional_assignments'],
            invitedBy: $actor,
        );

        return response()->json([
            'message' => __('Invitation sent.'),
            'user_id' => $created->id,
        ], JsonResponse::HTTP_CREATED);
    }
}
