<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\UserDevice;
use App\Services\Device\DeviceTrustService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DeviceTrustServiceTest extends TestCase
{
    use RefreshDatabase;

    private DeviceTrustService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);
        $this->service = app(DeviceTrustService::class);
    }

    public function test_enforce_skips_when_device_lock_disabled(): void
    {
        config(['bibo.device_lock.enabled' => false]);

        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole('it_admin');

        $this->service->enforceForUser($user, null);
        $this->assertTrue(true);
    }

    public function test_enforce_throws_when_device_missing_for_enforced_roles(): void
    {
        config([
            'bibo.device_lock.enabled' => true,
            'bibo.device_lock.enforce_on_roles' => ['it_admin'],
        ]);

        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole('it_admin');

        try {
            $this->service->enforceForUser($user, '');
            $this->fail('Expected ValidationException');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('X-Device-Id', $exception->errors());
        }
    }

    public function test_request_device_trusted_requires_registered_device_when_enforced_roles_intersect(): void
    {
        config([
            'bibo.device_lock.enabled' => true,
        ]);

        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole('it_admin');

        $enforce = ['it_admin'];

        $this->assertFalse($this->service->requestDeviceIsTrusted($user, null, $enforce));
        $this->assertFalse($this->service->requestDeviceIsTrusted($user, 'missing-device', $enforce));

        UserDevice::query()->create([
            'user_id' => $user->id,
            'device_id' => substr('trusted-key', 0, 128),
            'ip_address' => '127.0.0.1',
            'last_seen_at' => now(),
        ]);

        $this->assertTrue($this->service->requestDeviceIsTrusted($user, 'trusted-key', $enforce));
    }
}
