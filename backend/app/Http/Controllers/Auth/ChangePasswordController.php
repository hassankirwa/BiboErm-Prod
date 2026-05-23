<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ChangePasswordController extends Controller
{
    public function __construct(
        private readonly RefreshTokenService $refreshTokens,
        private readonly OwenAuditLogger $audit,
    ) {}

    public function update(ChangePasswordRequest $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($request->validated('current_password'), $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'current_password' => [__('Current password is incorrect.')],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
            'must_change_password' => false,
        ])->save();

        Auth::logoutOtherDevices($request->validated('password'));

        $this->refreshTokens->clearRefreshToken($user);

        $this->audit->log(
            module: 'auth',
            action: 'password_change',
            entityType: 'user',
            entityId: $user->id,
        );

        return response()->noContent();
    }
}
