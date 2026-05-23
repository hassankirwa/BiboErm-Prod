<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie as SymfonyCookie;

class RefreshTokenService
{
    public function issueRefreshTokenCookie(User $user): SymfonyCookie
    {
        $plain = Str::random(64);
        $days = (int) config('bibo.refresh_token.expire_days', 30);
        $minutes = $days * 24 * 60;

        $user->forceFill([
            'refresh_token_hash' => hash('sha256', $plain),
            'refresh_token_expires_at' => now()->addDays($days),
            'refresh_token_issued_at' => now(),
        ])->save();

        return Cookie::make(
            config('bibo.refresh_token.cookie'),
            $plain,
            $minutes,
            '/',
            config('session.domain'),
            config('session.secure_cookie', false),
            true,
            false,
            config('session.same_site', 'lax')
        );
    }

    public function clearRefreshToken(User $user): void
    {
        $user->forceFill([
            'refresh_token_hash' => null,
            'refresh_token_expires_at' => null,
            'refresh_token_issued_at' => null,
        ])->save();
    }

    public function revokeCookie(): SymfonyCookie
    {
        return Cookie::forget(
            config('bibo.refresh_token.cookie'),
            '/',
            config('session.domain')
        );
    }

    public function authenticate(?string $plainToken): ?User
    {
        if (! $plainToken) {
            return null;
        }

        $hash = hash('sha256', $plainToken);

        /** @var User|null $user */
        $user = User::query()
            ->where('refresh_token_hash', $hash)
            ->where('refresh_token_expires_at', '>', now())
            ->first();

        return $user;
    }
}
