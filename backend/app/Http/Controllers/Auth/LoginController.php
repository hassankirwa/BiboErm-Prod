<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\SendsAuthResponses;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Auth\RefreshTokenService;
use App\Services\Device\DeviceTrustService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    use SendsAuthResponses;

    public function __construct(
        private readonly RefreshTokenService $refreshTokens,
        private readonly DeviceTrustService $devices,
        private readonly OwenAuditLogger $audit,
    ) {}

    public function store(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();

        if ($user->status === User::STATUS_INVITED) {
            Auth::logout();

            return response()->json(['message' => 'Please complete your invitation acceptance first.'], 422);
        }

        if (in_array($user->status, [User::STATUS_SUSPENDED, User::STATUS_INACTIVE], true)) {
            Auth::logout();

            return response()->json(['message' => 'Your account is not active.'], 403);
        }

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

        return response()->json($this->authPayload($user->fresh()))->withCookie($cookie);
    }
}
