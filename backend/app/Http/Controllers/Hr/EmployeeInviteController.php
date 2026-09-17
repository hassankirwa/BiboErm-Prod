<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\InvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeInviteController extends Controller
{
    public function store(User $user, Request $request, InvitationService $invitations): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        /** @var User $actor */
        $actor = $request->user();

        $result = $invitations->inviteExistingUser(
            $user,
            $actor,
            $validated['email'] ?? null,
        );

        return response()->json($result->toArray());
    }
}
