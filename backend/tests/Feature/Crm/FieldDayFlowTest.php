<?php

namespace Tests\Feature\Crm;

use App\Models\FieldDay;
use App\Models\FieldDayPin;
use App\Models\Lead;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class FieldDayFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

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
    }

    public function test_sales_rep_can_start_field_day_add_pin_and_convert_to_lead(): void
    {
        Sanctum::actingAs($this->salesRep);

        $today = now()->toDateString();

        $start = $this->postJson('/api/v1/crm/field-days/start', [
            'field_date' => $today,
        ]);

        $start->assertCreated();
        $fieldDayId = $start->json('data.id');

        $this->assertDatabaseHas('field_days', [
            'id' => $fieldDayId,
            'field_officer_id' => $this->salesRep->id,
        ]);
        $this->assertEquals($today, FieldDay::query()->find($fieldDayId)?->field_date?->toDateString());

        $reuse = $this->postJson('/api/v1/crm/field-days/start', [
            'field_date' => $today,
        ]);

        $reuse->assertOk();
        $this->assertSame($fieldDayId, $reuse->json('data.id'));

        $capturedAt = now()->toIso8601String();

        $pinResponse = $this->postJson("/api/v1/crm/field-days/{$fieldDayId}/pins", [
            'latitude' => -1.2921,
            'longitude' => 36.8219,
            'accuracy_m' => 12,
            'captured_at' => $capturedAt,
            'notes' => 'Client prefers morning visits',
            'findings' => 'Needs roller blinds on 12 windows',
            'site_label' => 'Westlands office block',
            'location_address' => 'Ring Road Parklands, Westlands, Nairobi, Kenya',
        ]);

        $pinResponse->assertCreated();
        $pinId = $pinResponse->json('data.id');

        $this->assertDatabaseHas('field_day_pins', [
            'id' => $pinId,
            'field_day_id' => $fieldDayId,
            'accuracy_m' => 12,
            'findings' => 'Needs roller blinds on 12 windows',
            'site_label' => 'Westlands office block',
            'location_address' => 'Ring Road Parklands, Westlands, Nairobi, Kenya',
        ]);

        Storage::fake('local');
        $this->postJson("/api/v1/crm/field-day-pins/{$pinId}/photos", [
            'file' => UploadedFile::fake()->create('site.jpg', 100, 'image/jpeg'),
        ])->assertCreated();

        $convert = $this->postJson("/api/v1/crm/field-day-pins/{$pinId}/convert-to-lead");

        $convert->assertCreated();
        $leadId = $convert->json('data.id');

        $fieldVisitSourceId = DB::table('crm_lead_sources')->where('slug', 'field_visit')->value('id');

        $this->assertDatabaseHas('leads', [
            'id' => $leadId,
            'lead_source_id' => $fieldVisitSourceId,
            'status' => 'new',
            'assigned_field_officer_id' => $this->salesRep->id,
            'site_name' => 'Westlands office block',
            'site_address' => 'Ring Road Parklands, Westlands, Nairobi, Kenya',
            'requirement_description' => 'Needs roller blinds on 12 windows',
            'source' => 'field_visit',
        ]);

        $this->assertDatabaseHas('field_day_pins', [
            'id' => $pinId,
            'lead_id' => $leadId,
        ]);

        $this->postJson("/api/v1/crm/field-day-pins/{$pinId}/convert-to-lead")
            ->assertStatus(422);
    }

    public function test_field_day_pin_with_kasarani_admin_metadata_converts_with_subcounty(): void
    {
        Sanctum::actingAs($this->salesRep);

        $start = $this->postJson('/api/v1/crm/field-days/start');
        $start->assertCreated();
        $fieldDayId = $start->json('data.id');

        $nairobiCountyId = DB::table('crm_counties')->where('slug', 'nairobi')->value('id');

        $pinResponse = $this->postJson("/api/v1/crm/field-days/{$fieldDayId}/pins", [
            'latitude' => -1.2195,
            'longitude' => 36.8965,
            'accuracy_m' => 15,
            'captured_at' => now()->toIso8601String(),
            'findings' => 'Needs curtains in living room',
            'site_label' => 'Kasarani apartment',
            'county_id' => $nairobiCountyId,
            'subcounty' => 'Kasarani',
            'ward' => null,
            'location_address' => 'Kasarani division, Nairobi',
        ]);

        $pinResponse->assertCreated();
        $pinId = $pinResponse->json('data.id');

        Storage::fake('local');
        $this->postJson("/api/v1/crm/field-day-pins/{$pinId}/photos", [
            'file' => UploadedFile::fake()->create('kasarani.jpg', 100, 'image/jpeg'),
        ])->assertCreated();

        $convert = $this->postJson("/api/v1/crm/field-day-pins/{$pinId}/convert-to-lead");
        $convert->assertCreated();

        $this->assertDatabaseHas('leads', [
            'id' => $convert->json('data.id'),
            'subcounty' => 'Kasarani',
            'county_id' => $nairobiCountyId,
            'site_address' => 'Kasarani, Nairobi',
        ]);
    }

    public function test_field_day_pin_requires_live_gps_metadata(): void
    {
        Sanctum::actingAs($this->salesRep);

        $start = $this->postJson('/api/v1/crm/field-days/start');
        $start->assertCreated();
        $fieldDayId = $start->json('data.id');

        $this->postJson("/api/v1/crm/field-days/{$fieldDayId}/pins", [
            'notes' => 'No GPS',
        ])->assertUnprocessable();

        $this->postJson("/api/v1/crm/field-days/{$fieldDayId}/pins", [
            'latitude' => -1.2921,
            'longitude' => 36.8219,
            'accuracy_m' => 12,
            'captured_at' => now()->toIso8601String(),
        ])->assertCreated();

        $this->postJson("/api/v1/crm/field-days/{$fieldDayId}/pins", [
            'latitude' => -1.2921,
            'longitude' => 36.8219,
            'accuracy_m' => 600,
            'captured_at' => now()->toIso8601String(),
        ])->assertUnprocessable();
    }

    public function test_manager_can_view_all_field_days_for_date(): void
    {
        Sanctum::actingAs($this->salesRep);

        $today = now()->toDateString();

        $this->postJson('/api/v1/crm/field-days/start', ['field_date' => $today])
            ->assertCreated();

        $manager = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $manager->assignRole('operations_manager');
        Sanctum::actingAs($manager);

        $response = $this->getJson("/api/v1/crm/field-days?field_date={$today}");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }
}
