<?php

namespace Tests\Feature\Crm;

use App\Models\CrmActivity;
use App\Models\Lead;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CrmActivityFilterTest extends TestCase
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

        $this->lead = Lead::query()->create([
            'reference' => 'LD-ACT-001',
            'lead_number' => 'LD-ACT-001',
            'name' => 'Activity Filter Lead',
            'first_name' => 'Activity',
            'status' => 'new',
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);
    }

    public function test_call_filter_includes_schedule_call_and_call_log(): void
    {
        Sanctum::actingAs($this->salesRep);

        foreach ([
            ['activity_type' => 'schedule_call', 'subject' => 'Follow up call', 'status' => 'pending'],
            ['activity_type' => 'call_log', 'subject' => 'Called client', 'status' => 'completed'],
            ['activity_type' => 'meeting', 'subject' => 'Site meeting', 'status' => 'pending'],
        ] as $row) {
            CrmActivity::query()->create([
                'activity_type' => $row['activity_type'],
                'type' => $row['activity_type'],
                'subject' => $row['subject'],
                'status' => $row['status'],
                'lead_id' => $this->lead->id,
                'activitable_type' => Lead::class,
                'activitable_id' => $this->lead->id,
                'assigned_to' => $this->salesRep->id,
                'created_by' => $this->salesRep->id,
            ]);
        }

        $response = $this->getJson('/api/v1/crm/activities?activity_type=call');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['subject' => 'Follow up call'])
            ->assertJsonFragment(['subject' => 'Called client']);
    }
}
