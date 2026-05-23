<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\RefreshTokenService;
use App\Services\Device\DeviceTrustService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RefreshSessionController extends Controller
{
    public function __construct(
        private readonly RefreshTokenService $refreshTokens,
        private readonly DeviceTrustService $devices,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $plain = $request->cookie(config('bibo.refresh_token.cookie'))
            ?? $request->input('refresh_token');

        $user = $this->refreshTokens->authenticate($plain);

        if (! $user) {
            return response()->json(['message' => 'Invalid or expired refresh token.'], 401);
        }

        if (in_array($user->status, [User::STATUS_SUSPENDED, User::STATUS_INACTIVE, User::STATUS_INVITED], true)) {
            return response()->json(['message' => 'Account cannot start a session.'], 403);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $this->devices->enforceForUser($user, $request->header('X-Device-Id'));
        $this->devices->touchOrCreate($user, $request->header('X-Device-Id'), $request);

        $cookie = $this->refreshTokens->issueRefreshTokenCookie($user);

        return response()->json(['message' => 'Session renewed.'])->withCookie($cookie);
    }
}
