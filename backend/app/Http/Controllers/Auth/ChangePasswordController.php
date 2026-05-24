<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Models\User;
use App\Models\UserInvitation;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        $newPassword = $request->validated('password');

        DB::transaction(function () use ($user, $newPassword) {
            $updates = [
                'password' => Hash::make($newPassword),
                'must_change_password' => false,
            ];

            if ($user->status === User::STATUS_INVITED) {
                $updates['status'] = User::STATUS_PENDING_PROFILE_COMPLETION;
                $updates['email_verified_at'] = now();

                UserInvitation::query()
                    ->where('user_id', $user->id)
                    ->whereNull('accepted_at')
                    ->whereNull('revoked_at')
                    ->update(['accepted_at' => now()]);
            }

            $user->forceFill($updates)->save();

            if (Auth::guard('web')->check()) {
                Auth::guard('web')->logoutOtherDevices($newPassword);
            }

            $this->refreshTokens->clearRefreshToken($user->fresh());

            $this->audit->log(
                module: 'auth',
                action: 'password_change',
                entityType: 'user',
                entityId: $user->id,
            );
        });

        return response()->noContent();
    }
}
