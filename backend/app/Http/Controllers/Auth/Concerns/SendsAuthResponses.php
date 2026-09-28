<?php

namespace App\Http\Controllers\Auth\Concerns;

use App\Models\User;
use App\Support\SharedAccount;
use App\Support\UserHomeRoute;

trait SendsAuthResponses
{
    protected function authPayload(User $user): array
    {
        $user->loadMissing(['profile', 'departmentRoles.department']);

        $departments = $user->departmentRoles->map(fn ($row) => [
            'id' => $row->department?->id,
            'name' => $row->department?->name,
            'slug' => $row->department?->slug,
            'default_module' => $row->department?->default_module,
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
                'two_factor_enabled' => (bool) $user->two_factor_enabled,
                'avatar_url' => $user->profile?->avatar_url,
                'is_shared_account' => SharedAccount::isShared($user),
            ],
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $this->resolveAuthPermissions($user),
            'departments' => $departments,
            'redirect' => $this->suggestedRedirect($user),
        ];
    }

    /**
     * @return list<string>
     */
    protected function resolveAuthPermissions(User $user): array
    {
        if ($user->hasRole('super_admin')) {
            return ['*'];
        }

        $hasDepartmentSuperAdmin = $user->departmentRoles()
            ->whereHas('role', fn ($query) => $query->where('name', 'super_admin'))
            ->exists();

        if ($hasDepartmentSuperAdmin) {
            return ['*'];
        }

        return $user->getAllPermissions()->pluck('name')->values()->all();
    }

    protected function suggestedRedirect(User $user): string
    {
        return match ($user->status) {
            User::STATUS_ACTIVE => $this->activeUserHome($user),
            User::STATUS_PENDING_PROFILE_COMPLETION => '/onboarding/profile',
            User::STATUS_PENDING_HR_REVIEW => '/onboarding/pending-hr',
            default => '/',
        };
    }

    protected function activeUserHome(User $user): string
    {
        return UserHomeRoute::forUser($user);
    }
}
