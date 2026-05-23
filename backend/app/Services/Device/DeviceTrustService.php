<?php

namespace App\Services\Device;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DeviceTrustService
{
    /**
     * Require X-Device-Id after login success when device lock is on and Spatie sees an enforced role name.
     */
    public function enforceForUser(User $user, ?string $deviceId): void
    {
        if (! config('bibo.device_lock.enabled', false)) {
            return;
        }

        $enforce = [...array_filter(array_map(trim(...), (array) config('bibo.device_lock.enforce_on_roles', [])))];
        if ($enforce === []) {
            return;
        }

        $intersect = array_intersect($user->getRoleNames()->all(), $enforce);
        if ($intersect === []) {
            return;
        }

        if ($deviceId === null || $deviceId === '') {
            throw ValidationException::withMessages([
                'X-Device-Id' => [__('Missing trusted device identifier.')],
            ]);
        }
    }

    public function touchOrCreate(User $user, ?string $deviceId, Request $request): void
    {
        if (! config('bibo.device_lock.enabled', false)) {
            return;
        }

        if ($deviceId === null || $deviceId === '') {
            return;
        }

        UserDevice::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'device_id' => substr($deviceId, 0, 128),
            ],
            [
                'ip_address' => $request->ip(),
                'last_seen_at' => now(),
            ]
        );
    }

    /**
     * @param  iterable<string>  $enforceRoleNames
     */
    public function requestDeviceIsTrusted(?User $authUser, ?string $deviceId, iterable $enforceRoleNames): bool
    {
        if (! config('bibo.device_lock.enabled', false)) {
            return true;
        }

        if (! $authUser instanceof User) {
            return true;
        }

        $enforce = [...$enforceRoleNames];
        if ($enforce !== []) {
            $roleIntersect = array_intersect($authUser->getRoleNames()->all(), $enforce);
            if ($roleIntersect === []) {
                return true;
            }
        }

        if ($deviceId === null || $deviceId === '') {
            return false;
        }

        return UserDevice::query()
            ->where('user_id', $authUser->id)
            ->where('device_id', substr($deviceId, 0, 128))
            ->exists();
    }
}
