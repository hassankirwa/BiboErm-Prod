<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class LogoutController extends Controller
{
    public function __construct(
        private readonly RefreshTokenService $refreshTokens,
    ) {}

    public function destroy(Request $request): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user) {
            $this->refreshTokens->clearRefreshToken($user);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent()->withCookie($this->refreshTokens->revokeCookie());
    }
}
