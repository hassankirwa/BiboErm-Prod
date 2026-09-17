<?php

namespace Tests\Feature\Hr;

use App\Models\HrSuggestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HrSuggestionAnonymityTest extends TestCase
{
    use RefreshDatabase;

    public function test_anonymous_suggestion_omits_user_id(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/my/hr-suggestions', [
            'body' => 'Please improve the canteen menu.',
            'is_anonymous' => true,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('hr_suggestions', [
            'body' => 'Please improve the canteen menu.',
            'is_anonymous' => true,
            'user_id' => null,
        ]);

        $this->assertNull(HrSuggestion::query()->latest('id')->first()?->user_id);
    }
}
