<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\SendsAuthResponses;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\InviteAcceptRequest;
use App\Models\User;
use App\Services\Auth\InvitationService;
use App\Services\Auth\RefreshTokenService;
use App\Services\Device\DeviceTrustService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class InviteAcceptController extends Controller
{
    use SendsAuthResponses;

    public function __construct(
        private readonly InvitationService $invitations,
        private readonly RefreshTokenService $refreshTokens,
        private readonly DeviceTrustService $devices,
    ) {}

    public function store(InviteAcceptRequest $request): JsonResponse
    {
        $data = $request->validated();

        $updated = $this->invitations->acceptInvitation($data['token'], $data['password']);

        Auth::guard('web')->login($updated);
        $request->session()->regenerate();

        /** @var User|null $logged */
        $logged = Auth::guard('web')->user();

        if (! $logged instanceof User) {
            abort(500, 'Invite acceptance succeeded but login failed.');
        }

        $user = $logged;

        $this->devices->enforceForUser($user, $request->header('X-Device-Id'));
        $this->devices->touchOrCreate($user, $request->header('X-Device-Id'), $request);

        return response()->json($this->authPayload($user->fresh([
            'departmentRoles.department',
            'profile',
        ])))->withCookie($this->refreshTokens->issueRefreshTokenCookie($user));
    }
}
