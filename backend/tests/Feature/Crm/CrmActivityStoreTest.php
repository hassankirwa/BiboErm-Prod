<?php

namespace Tests\Feature\Crm;

use App\Models\Lead;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CrmActivityStoreTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

    protected Lead $lead;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            CrmLookupSeeder::class,
        ]);

        $this->salesRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->salesRep->assignRole('sales_representative');

        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->lead = Lead::query()->create([
            'reference' => 'LD-ACT-STORE-001',
            'lead_number' => 'LD-ACT-STORE-001',
            'name' => 'Activity Store Lead',
            'first_name' => 'Activity',
            'status' => 'new',
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);
    }

    /** @dataProvider v2ActivityTypeProvider */
    public function test_can_store_v2_activity_types(string $activityType): void
    {
        $response = $this->actingAs($this->salesRep)->postJson('/api/v1/crm/activities', [
            'lead_id' => $this->lead->id,
            'subject' => "Test {$activityType}",
            'activity_type' => $activityType,
            'type' => $activityType,
            'due_at' => now()->addDay()->toIso8601String(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.activity_type', $activityType)
            ->assertJsonPath('data.type', $activityType);

        $this->assertDatabaseHas('crm_activities', [
            'lead_id' => $this->lead->id,
            'activity_type' => $activityType,
            'type' => $activityType,
            'subject' => "Test {$activityType}",
        ]);
    }

    public static function v2ActivityTypeProvider(): array
    {
        return [
            'follow_up' => ['follow_up'],
            'create_task' => ['create_task'],
            'call_log' => ['call_log'],
            'meeting_note' => ['meeting_note'],
            'email_sent' => ['email_sent'],
            'schedule_meeting' => ['schedule_meeting'],
        ];
    }

    public function test_rejects_unknown_activity_type(): void
    {
        $response = $this->actingAs($this->salesRep)->postJson('/api/v1/crm/activities', [
            'lead_id' => $this->lead->id,
            'subject' => 'Invalid type',
            'activity_type' => 'unknown_type',
            'type' => 'unknown_type',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['activity_type', 'type']);
    }
}
