<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserProfile;
use Tests\Support\InteractsWithSeededApplication;

class ProfileOnboardingTransitionTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_profile_minimum_fields_move_user_to_pending_hr_review(): void
    {
        /** @var User $user */
        $user = User::factory()->create([
            'status' => User::STATUS_PENDING_PROFILE_COMPLETION,
            'must_change_password' => false,
        ]);

        UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $this->actingAsSanctum($user);

        $this->putJson('/api/profile', [
            'phone' => '+44123456789',
            'emergency_contact_name' => 'Alex Contact',
            'emergency_contact_phone' => '+44111222333',
        ])->assertOk()
            ->assertJsonFragment(['message' => __('Profile saved.')]);

        $user->refresh();
        $this->assertSame(User::STATUS_PENDING_HR_REVIEW, $user->status);
        $this->assertNotNull($user->onboarding_completed_at);
    }
}
