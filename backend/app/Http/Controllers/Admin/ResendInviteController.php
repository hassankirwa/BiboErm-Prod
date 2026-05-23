<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\InvitationService;
use Illuminate\Http\Response;

class ResendInviteController extends Controller
{
    public function store(User $user, InvitationService $invitations): Response
    {
        /** @var User $actor */
        $actor = request()->user();
        $invitations->resendForUser($user, $actor);

        return response()->noContent();
    }
}
