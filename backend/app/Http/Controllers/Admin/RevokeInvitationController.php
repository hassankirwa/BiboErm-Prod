<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserInvitation;
use App\Services\Auth\InvitationService;
use Illuminate\Http\Response;

class RevokeInvitationController extends Controller
{
    public function store(UserInvitation $invitation, InvitationService $invitations): Response
    {
        $invitations->revokeInvitation($invitation);

        return response()->noContent();
    }
}
