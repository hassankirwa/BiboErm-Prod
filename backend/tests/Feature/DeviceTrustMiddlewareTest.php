<?php

namespace Tests\Feature;

use App\Models\UserDevice;
use Tests\Support\InteractsWithSeededApplication;

class DeviceTrustMiddlewareTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
        config([
            'bibo.device_lock.enabled' => true,
            'bibo.device_lock.enforce_on_roles' => ['it_admin'],
        ]);
    }

    public function test_change_password_blocked_without_trusted_device_header_when_locked(): void
    {
        $user = $this->userWithDepartmentRole('it', 'it_admin');

        $this->actingAsSanctum($user);

        $this->postJson('/api/auth/change-password', [
            'current_password' => 'password',
            'password' => 'NewStrongPass99!',
            'password_confirmation' => 'NewStrongPass99!',
        ])->assertForbidden()
            ->assertJsonFragment(['message' => __('Unrecognized device. Sign in once with header X-Device-Id matching the app client ID.')]);
    }

    public function test_profile_update_succeeds_with_registered_device_when_locked(): void
    {
        $user = $this->userWithDepartmentRole('it', 'it_admin', [
            'status' => \App\Models\User::STATUS_PENDING_PROFILE_COMPLETION,
        ]);

        UserDevice::query()->create([
            'user_id' => $user->id,
            'device_id' => 'unit-test-device-1',
            'ip_address' => '127.0.0.1',
            'last_seen_at' => now(),
        ]);

        $this->actingAsSanctum($user);

        $this->withHeaders(['X-Device-Id' => 'unit-test-device-1'])
            ->putJson('/api/profile', [
                'phone' => '+44111222334',
            ])->assertOk()
            ->assertJsonFragment(['message' => __('Profile saved.')]);
    }
}
