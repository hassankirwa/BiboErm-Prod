<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Lead;
use App\Models\SiteVisit;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SiteVisitWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

    protected User $fieldOfficer;

    protected User $otherFieldOfficer;

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

        $this->fieldOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->fieldOfficer->assignRole('field_officer');

        $this->otherFieldOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->otherFieldOfficer->assignRole('field_officer');
    }

    public function test_field_officer_can_complete_visit_and_advance_linked_lead(): void
    {
        Sanctum::actingAs($this->salesRep);

        $lead = Lead::query()->create([
            'reference' => 'LD-FIELD-001',
            'lead_number' => 'LD-FIELD-001',
            'name' => 'Karen Heights Blinds',
            'first_name' => 'Karen',
            'status' => LeadStatus::Qualified,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $visitResponse = $this->postJson('/api/v1/crm/site-visits', [
            'title' => 'Karen Heights measurement',
            'lead_id' => $lead->id,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'visit_date' => now()->toDateString(),
            'site_address' => 'Karen, Nairobi',
        ]);

        $visitResponse->assertCreated();
        $visitId = $visitResponse->json('data.id');

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'status' => LeadStatus::SiteVisitScheduled->value,
        ]);

        Sanctum::actingAs($this->fieldOfficer);

        $this->getJson("/api/v1/crm/site-visits/{$visitId}")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::Scheduled->value);

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/start", [
            'latitude' => -1.319,
            'longitude' => 36.707,
        ])->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::InProgress->value);

        $this->patchJson("/api/v1/crm/site-visits/{$visitId}/measurement-form", [
            'form' => [
                'lines' => [
                    [
                        'ref' => '1',
                        'room_location' => 'Master bedroom',
                        'product_type' => 'Window',
                        'quantity' => 1,
                        'width_centre_mm' => 1800,
                        'height_centre_mm' => 2100,
                    ],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::MeasurementsCaptured->value);

        $this->assertDatabaseHas('site_visits', [
            'id' => $visitId,
            'status' => SiteVisitStatus::MeasurementsCaptured->value,
        ]);

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/submit", [
            'client_present' => true,
            'visit_outcome' => 'completed',
            'field_officer_notes' => 'Client requested blackout fabric.',
        ])->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::SubmittedForReview->value);

        $this->assertDatabaseHas('site_visits', [
            'id' => $visitId,
            'status' => SiteVisitStatus::SubmittedForReview->value,
            'field_officer_notes' => 'Client requested blackout fabric.',
        ]);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'status' => LeadStatus::MeasurementsCaptured->value,
        ]);
    }

    public function test_draft_measurement_form_save_allows_partial_data(): void
    {
        $visit = SiteVisit::query()->create([
            'visit_number' => 'SV-DRAFT-001',
            'title' => 'Draft save visit',
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::InProgress->value,
            'requires_measurements' => true,
        ]);

        Sanctum::actingAs($this->fieldOfficer);

        $this->patchJson("/api/v1/crm/site-visits/{$visit->id}/measurement-form", [
            'draft' => true,
            'form' => [
                'client_name' => 'Partial save client',
                'lines' => [],
            ],
        ])->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::InProgress->value)
            ->assertJsonPath('data.measurement_form_data.client_name', 'Partial save client');
    }

    public function test_field_officer_cannot_execute_visit_assigned_to_another_officer(): void
    {
        $visit = SiteVisit::query()->create([
            'visit_number' => 'SV-TEST-001',
            'title' => 'Other officer visit',
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::Scheduled->value,
        ]);

        Sanctum::actingAs($this->otherFieldOfficer);

        $this->postJson("/api/v1/crm/site-visits/{$visit->id}/start")
            ->assertForbidden();
    }

    public function test_submit_requires_saved_measurements(): void
    {
        $visit = SiteVisit::query()->create([
            'visit_number' => 'SV-TEST-002',
            'title' => 'No measurements yet',
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::MeasurementsCaptured->value,
            'requires_measurements' => true,
        ]);

        Sanctum::actingAs($this->fieldOfficer);

        $this->postJson("/api/v1/crm/site-visits/{$visit->id}/submit")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['form']);
    }

    public function test_sales_rep_can_self_assign_and_execute_visit(): void
    {
        Sanctum::actingAs($this->salesRep);

        $lead = Lead::query()->create([
            'reference' => 'LD-SELF-001',
            'lead_number' => 'LD-SELF-001',
            'name' => 'Self assign lead',
            'first_name' => 'Self',
            'status' => LeadStatus::Qualified,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $visitResponse = $this->postJson('/api/v1/crm/site-visits', [
            'title' => 'Sales-led measurement',
            'lead_id' => $lead->id,
            'assigned_field_officer_id' => $this->salesRep->id,
            'visit_date' => now()->toDateString(),
            'site_address' => 'Kilimani, Nairobi',
            'measurement_context' => 'quotation',
        ]);

        $visitResponse->assertCreated();
        $visitId = $visitResponse->json('data.id');

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/start")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::InProgress->value);
    }

    public function test_site_visit_schedule_rejects_ineligible_assignee(): void
    {
        $financeOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $financeOfficer->assignRole('finance_officer');

        Sanctum::actingAs($this->salesRep);

        $lead = Lead::query()->create([
            'reference' => 'LD-INVALID-001',
            'lead_number' => 'LD-INVALID-001',
            'name' => 'Invalid assignee lead',
            'first_name' => 'Invalid',
            'status' => LeadStatus::Qualified,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $this->postJson('/api/v1/crm/site-visits', [
            'title' => 'Invalid assignee visit',
            'lead_id' => $lead->id,
            'assigned_field_officer_id' => $financeOfficer->id,
            'visit_date' => now()->toDateString(),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_field_officer_id']);
    }

    public function test_eligible_assignee_can_start_visit_with_site_visits_view_only(): void
    {
        $guard = config('permission.defaults.guard', 'web');
        Role::findByName('production_manager', $guard)?->syncPermissions(['site_visits.view']);

        $productionManager = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $productionManager->assignRole('production_manager');

        $visit = SiteVisit::query()->create([
            'visit_number' => 'SV-VIEW-ONLY-001',
            'title' => 'Production manager measurement',
            'assigned_field_officer_id' => $productionManager->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::Scheduled->value,
        ]);

        Sanctum::actingAs($productionManager);

        $this->postJson("/api/v1/crm/site-visits/{$visit->id}/start")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::InProgress->value);
    }

    public function test_installation_engineer_can_execute_assigned_visit(): void
    {
        $engineer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $engineer->assignRole('field_installation_engineer');

        $visit = SiteVisit::query()->create([
            'visit_number' => 'SV-INSTALL-001',
            'title' => 'Installation-led measurement',
            'assigned_field_officer_id' => $engineer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::Scheduled->value,
        ]);

        Sanctum::actingAs($engineer);

        $this->postJson("/api/v1/crm/site-visits/{$visit->id}/start")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::InProgress->value);
    }

    public function test_site_visit_assignee_lookup_includes_sales_and_field_roles(): void
    {
        $productionManager = User::factory()->create([
            'status' => User::STATUS_ACTIVE,
            'name' => 'Production Manager',
        ]);
        $productionManager->assignRole('production_manager');

        Sanctum::actingAs($this->salesRep);

        $response = $this->getJson('/api/v1/crm/lookups/users?context=site_visits');

        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($this->salesRep->id, $ids);
        $this->assertContains($this->fieldOfficer->id, $ids);
        $this->assertContains($productionManager->id, $ids);
    }
}
