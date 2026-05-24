<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\InvitationService;
use Illuminate\Http\JsonResponse;

class ResendInviteController extends Controller
{
    public function store(User $user, InvitationService $invitations): JsonResponse
    {
        /** @var User $actor */
        $actor = request()->user();

        $result = $invitations->resendForUser($user, $actor);

        return response()->json($result->toArray());
    }
}
