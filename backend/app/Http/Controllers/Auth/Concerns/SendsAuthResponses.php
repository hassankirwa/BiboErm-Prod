<?php

namespace App\Http\Controllers\Auth\Concerns;

use App\Models\User;

trait SendsAuthResponses
{
    protected function authPayload(User $user): array
    {
        $user->loadMissing(['departmentRoles.department']);

        $departments = $user->departmentRoles->map(fn ($row) => [
            'id' => $row->department?->id,
            'name' => $row->department?->name,
            'slug' => $row->department?->slug,
            'is_primary' => (bool) $row->is_primary,
            'role_id' => $row->role_id,
        ])->values()->all();

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                'onboarding_completed_at' => $user->onboarding_completed_at?->toIso8601String(),
                'must_change_password' => (bool) $user->must_change_password,
            ],
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'departments' => $departments,
            'redirect' => $this->suggestedRedirect($user),
        ];
    }

    protected function suggestedRedirect(User $user): string
    {
        return match ($user->status) {
            User::STATUS_ACTIVE => '/workspace',
            User::STATUS_PENDING_PROFILE_COMPLETION => '/onboarding/profile',
            User::STATUS_PENDING_HR_REVIEW => '/onboarding/pending-hr',
            default => '/',
        };
    }
}
