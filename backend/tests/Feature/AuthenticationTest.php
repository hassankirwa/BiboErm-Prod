<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Auth\RefreshTokenService;
use Tests\Support\InteractsWithSeededApplication;

class AuthenticationTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'valid@example.com',
            'password' => 'password',
        ]);

        $this->postJsonStateful('/api/auth/login', [
            'email' => 'valid@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Invalid credentials.']);
    }

    public function test_login_rejects_invited_user(): void
    {
        User::factory()->create([
            'email' => 'invited@example.com',
            'password' => 'password',
            'status' => User::STATUS_INVITED,
        ]);

        $this->postJsonStateful('/api/auth/login', [
            'email' => 'invited@example.com',
            'password' => 'password',
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Please complete your invitation acceptance first.']);
    }

    public function test_login_rejects_inactive_accounts(): void
    {
        User::factory()->create([
            'email' => 'suspended@example.com',
            'password' => 'password',
            'status' => User::STATUS_SUSPENDED,
        ]);

        $this->postJsonStateful('/api/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'password',
        ])->assertForbidden()
            ->assertJsonFragment(['message' => 'Your account is not active.']);

        User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => 'password',
            'status' => User::STATUS_INACTIVE,
        ]);

        $this->postJsonStateful('/api/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'password',
        ])->assertForbidden();
    }

    public function test_login_returns_auth_payload_and_sets_refresh_cookie(): void
    {
        $user = User::factory()->create([
            'email' => 'active@example.com',
            'password' => 'password',
            'status' => User::STATUS_ACTIVE,
        ]);

        $response = $this->postJsonStateful('/api/auth/login', [
            'email' => 'active@example.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $response->assertCookie(config('bibo.refresh_token.cookie'));
    }

    public function test_refresh_rejects_when_no_valid_refresh_cookie(): void
    {
        $this->postJsonStateful('/api/auth/refresh')->assertUnauthorized();
    }

    public function test_refresh_issues_session_via_refresh_token(): void
    {
        $user = User::factory()->create([
            'email' => 'refresh@example.com',
            'password' => 'password',
            'status' => User::STATUS_ACTIVE,
        ]);

        $issued = app(RefreshTokenService::class)->issueRefreshTokenCookie($user);

        $renew = $this->postJsonStateful('/api/auth/refresh', [
            'refresh_token' => $issued->getValue(),
        ]);

        $renew->assertOk()
            ->assertJsonFragment(['message' => 'Session renewed.']);

        $renew->assertCookie(config('bibo.refresh_token.cookie'));
    }

    public function test_auth_me_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_authenticated_auth_me_returns_payload_shape(): void
    {
        $user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->actingAsSanctum($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'email', 'status'],
                'roles',
                'permissions',
                'departments',
                'redirect',
            ]);
    }

    public function test_logout_clears_refresh_and_returns_no_content(): void
    {
        $user = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        app(RefreshTokenService::class)->issueRefreshTokenCookie($user);
        $this->assertNotNull($user->fresh()->refresh_token_hash);

        $this->actingAsSanctum($user);

        $this->postJsonStateful('/api/auth/logout')
            ->assertNoContent();

        $this->assertNull($user->fresh()->refresh_token_hash);
    }
}
