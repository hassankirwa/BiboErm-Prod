<?php

namespace App\Services\Auth;

use App\Http\Controllers\Auth\Concerns\SendsAuthResponses;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Auth\RefreshTokenService;
use App\Services\Device\DeviceTrustService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class LoginCompletionService
{
    use SendsAuthResponses;

    public function __construct(
        private readonly RefreshTokenService $refreshTokens,
        private readonly DeviceTrustService $devices,
        private readonly OwenAuditLogger $audit,
    ) {}

    public function complete(User $user, Request $request, bool $remember = false): JsonResponse
    {
        Auth::login($user, $remember);
        $request->session()->regenerate();

        $this->devices->enforceForUser($user, $request->header('X-Device-Id'));

        $user->forceFill(['last_login_at' => now()])->save();

        $this->devices->touchOrCreate($user, $request->header('X-Device-Id'), $request);

        $this->audit->log(
            module: 'auth',
            action: 'login',
            entityType: 'user',
            entityId: $user->id,
            newValues: ['email' => $user->email, 'status' => $user->status],
        );

        $cookie = $this->refreshTokens->issueRefreshTokenCookie($user);

        return response()->json($this->authPayload($user->fresh(['profile'])))->withCookie($cookie);
    }
}
