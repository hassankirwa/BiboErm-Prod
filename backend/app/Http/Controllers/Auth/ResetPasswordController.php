<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResetPasswordController extends Controller
{
    public function __construct(
        private readonly RefreshTokenService $refreshTokens,
        private readonly OwenAuditLogger $audit,
    ) {}

    public function store(ResetPasswordRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $status = Password::broker()->reset(
            $credentials,
            function (User $user, string $password): void {
                $this->refreshTokens->clearRefreshToken($user);

                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                Event::dispatch(new PasswordReset($user));

                $this->audit->log(
                    module: 'auth',
                    action: 'password_reset',
                    entityType: 'user',
                    entityId: $user->id,
                    newValues: ['email' => $user->email],
                );
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => [__('This password reset link is invalid or has expired.')],
            ]);
        }

        return response()->json(['message' => __('Password reset successfully.')]);
    }
}
