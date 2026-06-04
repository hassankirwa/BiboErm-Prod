<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\Support\InteractsWithSeededApplication;

class MiddlewareProtectionTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_suspended_users_cannot_access_protected_api(): void
    {
        $user = User::factory()->create([
            'status' => User::STATUS_SUSPENDED,
        ]);
        $this->actingAsSanctum($user);

        $this->getJson('/api/auth/me')
            ->assertForbidden()
            ->assertJsonFragment(['message' => __('Your account is not active.')]);
    }

    public function test_invited_users_without_acceptance_cannot_access_protected_api(): void
    {
        $user = User::factory()->create([
            'status' => User::STATUS_INVITED,
        ]);
        $this->actingAsSanctum($user);

        $this->getJson('/api/auth/me')
            ->assertForbidden()
            ->assertJsonFragment(['message' => __('Please accept your invitation first.')]);
    }
}
