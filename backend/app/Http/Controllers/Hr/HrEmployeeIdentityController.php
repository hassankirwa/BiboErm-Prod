<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hr\UpdateEmployeeIdentityRequest;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Auth\RefreshTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class HrEmployeeIdentityController extends Controller
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
        private readonly RefreshTokenService $refreshTokens,
    ) {}

    public function update(User $user, UpdateEmployeeIdentityRequest $request): JsonResponse
    {
        if (! in_array($user->status, [
            User::STATUS_ACTIVE,
            User::STATUS_PENDING_HR_REVIEW,
            User::STATUS_PENDING_PROFILE_COMPLETION,
            User::STATUS_INVITED,
            User::STATUS_SUSPENDED,
        ], true)) {
            throw ValidationException::withMessages([
                'user' => [__('Identity cannot be updated for this account status.')],
            ]);
        }

        $data = $request->validated();
        $old = [
            'email' => $user->email,
            'name' => $user->name,
        ];

        $updates = [
            'email' => mb_strtolower(trim($data['email'])),
        ];

        if (array_key_exists('name', $data) && filled($data['name'])) {
            $updates['name'] = trim($data['name']);
        }

        if ($updates['email'] !== $user->email) {
            $updates['email_verified_at'] = null;
        }

        $user->forceFill($updates)->save();

        $this->audit->log(
            module: 'users',
            action: 'identity_update',
            entityType: 'user',
            entityId: $user->id,
            oldValues: $old,
            newValues: $user->only(['email', 'name']),
        );

        return response()->json([
            'message' => __('Account identity updated.'),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function resetPassword(User $user): JsonResponse
    {
        if (! in_array($user->status, [
            User::STATUS_ACTIVE,
            User::STATUS_PENDING_HR_REVIEW,
            User::STATUS_PENDING_PROFILE_COMPLETION,
            User::STATUS_INVITED,
            User::STATUS_SUSPENDED,
        ], true)) {
            throw ValidationException::withMessages([
                'user' => [__('Password cannot be reset for this account status.')],
            ]);
        }

        $tempPassword = Str::password(14);

        $user->forceFill([
            'password' => Hash::make($tempPassword),
            'must_change_password' => true,
        ])->save();

        $this->refreshTokens->clearRefreshToken($user);

        $this->audit->log(
            module: 'users',
            action: 'admin_password_reset',
            entityType: 'user',
            entityId: $user->id,
            newValues: ['must_change_password' => true],
        );

        return response()->json([
            'message' => __('Temporary password generated. Share it securely with the employee.'),
            'temporary_password' => $tempPassword,
            'must_change_password' => true,
        ]);
    }
}
