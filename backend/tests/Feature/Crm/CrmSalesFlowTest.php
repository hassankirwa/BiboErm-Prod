<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Department;
use App\Models\Lead;
use App\Models\SiteVisit;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use App\Jobs\Crm\CreateAccountFromLead;
use App\Services\Crm\Leads\AccountProvisioningService;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CrmSalesFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

    protected User $fieldOfficer;

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
    }

    public function test_end_to_end_crm_sales_flow(): void
    {
        Sanctum::actingAs($this->salesRep);

        $leadTypeId = DB::table('crm_lead_types')->where('slug', 'company')->value('id');
        $leadSourceId = DB::table('crm_lead_sources')->where('slug', 'walk_in')->value('id');

        $createLead = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Westlands Office Blinds',
            'contact_person_name' => 'Brian Otieno',
            'phone' => '+254712345678',
            'lead_type_id' => $leadTypeId,
            'lead_source_id' => $leadSourceId,
            'account_name' => 'Prime Offices Ltd',
            'product_interests' => ['blinds'],
            'requirement_description' => 'Roller blinds for offices',
            'need_site_visit' => true,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'lead_owner_id' => $this->salesRep->id,
        ]);

        $createLead->assertCreated();
        $leadId = $createLead->json('data.id');

        $this->assertDatabaseHas('contacts', [
            'source_lead_id' => $leadId,
            'name' => 'Brian Otieno',
            'phone' => '+254712345678',
        ]);

        Queue::fake();

        foreach ([LeadStatus::Contacted, LeadStatus::Interested] as $status) {
            $this->patchJson("/api/v1/crm/leads/{$leadId}/status", [
                'status' => $status->value,
            ])->assertOk();
        }

        (new CreateAccountFromLead($leadId, $this->salesRep->id))
            ->handle(app(AccountProvisioningService::class));

        $lead = Lead::query()->findOrFail($leadId);
        $accountId = $lead->converted_account_id;
        $this->assertNotNull($accountId);

        $visitResponse = $this->postJson('/api/v1/crm/site-visits', [
            'title' => 'Prime Offices measurement',
            'lead_id' => $leadId,
            'account_id' => $accountId,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'visit_date' => now()->addDay()->toDateString(),
            'site_address' => 'Westlands, Nairobi',
        ]);

        $visitResponse->assertCreated();
        $visitId = $visitResponse->json('data.id');

        Sanctum::actingAs($this->fieldOfficer);

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/start", [
            'latitude' => -1.267,
            'longitude' => 36.810,
        ])->assertOk();

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/measurements", [
            'lines' => [
                [
                    'room_area_name' => 'Conference room',
                    'width' => 2.5,
                    'height' => 1.8,
                    'quantity' => 2,
                ],
            ],
        ])->assertOk();

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/submit", [
            'client_present' => true,
            'visit_outcome' => 'completed',
        ])->assertOk();

        Sanctum::actingAs($this->salesRep);

        $this->postJson("/api/v1/crm/site-visits/{$visitId}/approve")->assertOk();

        $this->assertDatabaseHas('site_visits', [
            'id' => $visitId,
            'account_id' => $accountId,
            'lead_id' => $leadId,
        ]);

        $quotation = $this->postJson("/api/v1/crm/accounts/{$accountId}/quotations", [
            'lines' => [
                [
                    'description' => 'Roller blinds package',
                    'quantity' => 1,
                    'unit_price' => 850000,
                ],
            ],
        ]);

        $quotation->assertCreated();
        $quotationId = $quotation->json('data.id');

        $this->postJson("/api/v1/crm/quotations/{$quotationId}/send")->assertOk();

        $dealId = \App\Models\Quotation::query()->findOrFail($quotationId)->deal_id;
        $this->assertNotNull($dealId);

        $this->assertDatabaseHas('deals', [
            'id' => $dealId,
            'account_id' => $accountId,
            'stage' => DealStage::QuotationSent->value,
        ]);

        $this->postJson("/api/v1/crm/quotations/{$quotationId}/accept")->assertOk();

        $deal = Deal::query()->findOrFail($dealId);
        $deal->update([
            'deposit_required_amount' => 426000,
            'deposit_required_percent' => 50,
        ]);

        $payment = $this->postJson("/api/v1/crm/deals/{$dealId}/payments", [
            'payment_reference' => 'MPESA-TEST-001',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 426000,
            'payment_method' => 'mpesa',
            'quotation_id' => $quotationId,
        ]);

        $payment->assertCreated();

        $this->getJson("/api/v1/crm/deals/{$dealId}/payments")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->postJson("/api/v1/crm/deals/{$dealId}/mark-won")->assertOk();

        $wonDeal = Deal::query()->findOrFail($dealId);
        $this->assertSame(DealStage::Won->value, $wonDeal->stage instanceof DealStage ? $wonDeal->stage->value : $wonDeal->stage);

        $project = $this->postJson("/api/v1/crm/deals/{$dealId}/create-project");

        $project->assertCreated();
        $projectId = $project->json('data.project.id');

        $this->assertDatabaseHas('projects', [
            'id' => $projectId,
            'deal_id' => $dealId,
            'account_id' => $accountId,
        ]);

        $wonDeal->refresh();
        $this->assertSame(
            DealStage::ProjectCreated->value,
            $wonDeal->stage instanceof DealStage ? $wonDeal->stage->value : $wonDeal->stage
        );
        $this->assertNotNull($wonDeal->project_id);

        $lead = Lead::query()->findOrFail($leadId);
        $this->assertSame(
            LeadStatus::AccountCreated->value,
            $lead->status instanceof LeadStatus ? $lead->status->value : $lead->status
        );
    }

    public function test_create_deal_requires_account(): void
    {
        Sanctum::actingAs($this->salesRep);

        $this->postJson('/api/v1/crm/deals', [
            'name' => 'Unlinked Deal',
            'estimated_value' => 100000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['account_id']);
    }

    public function test_create_deal_with_account_and_infers_from_contact(): void
    {
        Sanctum::actingAs($this->salesRep);

        $account = Account::query()->create([
            'account_number' => 'AC-TEST-001',
            'name' => 'Linked Account Ltd',
            'status' => 'prospect',
            'account_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $contact = Contact::query()->create([
            'contact_number' => 'CT-TEST-001',
            'name' => 'Jane Client',
            'first_name' => 'Jane',
            'phone' => '+254711111111',
            'status' => 'new_contact',
            'account_id' => $account->id,
            'contact_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $withAccount = $this->postJson('/api/v1/crm/deals', [
            'name' => 'Account-linked Deal',
            'account_id' => $account->id,
            'estimated_value' => 250000,
        ]);

        $withAccount->assertCreated();
        $this->assertDatabaseHas('deals', [
            'id' => $withAccount->json('data.id'),
            'account_id' => $account->id,
        ]);

        $fromContact = $this->postJson('/api/v1/crm/deals', [
            'name' => 'Contact-linked Deal',
            'contact_id' => $contact->id,
            'estimated_value' => 150000,
        ]);

        $fromContact->assertCreated();
        $this->assertDatabaseHas('deals', [
            'id' => $fromContact->json('data.id'),
            'account_id' => $account->id,
            'primary_contact_id' => $contact->id,
        ]);
    }

    public function test_sales_rep_cannot_see_other_reps_leads_without_view_all(): void
    {
        $otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $otherRep->assignRole('sales_representative');

        $lead = Lead::query()->create([
            'reference' => 'LD-SCOPE-001',
            'lead_number' => 'LD-SCOPE-001',
            'name' => 'Scoped Lead',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'contact_person_name' => 'Jane Doe',
            'phone' => '+254700000001',
            'product_interests' => ['blinds'],
            'requirement_description' => 'Test',
            'need_site_visit' => false,
            'status' => LeadStatus::New->value,
            'lead_owner_id' => $otherRep->id,
            'created_by' => $otherRep->id,
        ]);

        Sanctum::actingAs($this->salesRep);

        $this->getJson('/api/v1/crm/leads')
            ->assertOk()
            ->assertJsonMissing(['id' => $lead->id]);
    }

    public function test_crm_manage_does_not_bypass_lead_owner_scoping(): void
    {
        $reception = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $reception->assignRole('reception');

        $otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $otherRep->assignRole('sales_representative');

        $lead = Lead::query()->create([
            'reference' => 'LD-SCOPE-002',
            'lead_number' => 'LD-SCOPE-002',
            'name' => 'Other Rep Lead',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'contact_person_name' => 'John Doe',
            'phone' => '+254700000002',
            'product_interests' => ['glass'],
            'requirement_description' => 'Test',
            'need_site_visit' => false,
            'status' => LeadStatus::New->value,
            'lead_owner_id' => $otherRep->id,
            'created_by' => $otherRep->id,
        ]);

        Sanctum::actingAs($reception);

        $this->getJson('/api/v1/crm/leads')
            ->assertOk()
            ->assertJsonMissing(['id' => $lead->id]);
    }

    public function test_contact_index_is_scoped_to_owner_unless_view_all(): void
    {
        $otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $otherRep->assignRole('sales_representative');

        $owned = Contact::query()->create([
            'contact_number' => 'CT-OWNED-001',
            'name' => 'My Contact',
            'first_name' => 'My',
            'last_name' => 'Contact',
            'status' => 'new_contact',
            'contact_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $other = Contact::query()->create([
            'contact_number' => 'CT-OTHER-001',
            'name' => 'Other Rep Contact',
            'first_name' => 'Other',
            'last_name' => 'Rep',
            'status' => 'new_contact',
            'contact_owner_id' => $otherRep->id,
            'owner_id' => $otherRep->id,
            'created_by' => $otherRep->id,
        ]);

        Sanctum::actingAs($this->salesRep);

        $this->getJson('/api/v1/crm/contacts')
            ->assertOk()
            ->assertJsonFragment(['id' => $owned->id])
            ->assertJsonMissing(['id' => $other->id]);
    }

    public function test_super_admin_sees_all_contacts_in_index(): void
    {
        $otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $otherRep->assignRole('sales_representative');

        $other = Contact::query()->create([
            'contact_number' => 'CT-OTHER-002',
            'name' => 'Other Rep Contact',
            'first_name' => 'Other',
            'last_name' => 'Rep',
            'status' => 'new_contact',
            'contact_owner_id' => $otherRep->id,
            'owner_id' => $otherRep->id,
            'created_by' => $otherRep->id,
        ]);

        $superAdmin = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $superAdmin->assignRole('super_admin');

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/v1/crm/contacts')
            ->assertOk()
            ->assertJsonFragment(['id' => $other->id]);
    }

    public function test_account_index_is_scoped_to_owner_unless_view_all(): void
    {
        $otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $otherRep->assignRole('sales_representative');

        $owned = Account::query()->create([
            'account_number' => 'AC-OWNED-001',
            'name' => 'My Account',
            'status' => 'prospect',
            'account_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $other = Account::query()->create([
            'account_number' => 'AC-OTHER-001',
            'name' => 'Other Rep Account',
            'status' => 'prospect',
            'account_owner_id' => $otherRep->id,
            'owner_id' => $otherRep->id,
            'created_by' => $otherRep->id,
        ]);

        Sanctum::actingAs($this->salesRep);

        $this->getJson('/api/v1/crm/accounts')
            ->assertOk()
            ->assertJsonFragment(['id' => $owned->id])
            ->assertJsonMissing(['id' => $other->id]);
    }

    public function test_super_admin_sees_all_accounts_in_index(): void
    {
        $otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $otherRep->assignRole('sales_representative');

        $other = Account::query()->create([
            'account_number' => 'AC-OTHER-002',
            'name' => 'Other Rep Account',
            'status' => 'prospect',
            'account_owner_id' => $otherRep->id,
            'owner_id' => $otherRep->id,
            'created_by' => $otherRep->id,
        ]);

        $superAdmin = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $superAdmin->assignRole('super_admin');

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/v1/crm/accounts')
            ->assertOk()
            ->assertJsonFragment(['id' => $other->id]);
    }

    public function test_super_admin_can_access_crm_leads_without_explicit_permission_assignment(): void
    {
        $superAdmin = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $superAdmin->assignRole('super_admin');

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/v1/crm/leads')->assertOk();
        $this->getJson('/api/v1/crm/contacts')->assertOk();
    }

    public function test_super_admin_with_department_role_only_can_access_crm(): void
    {
        $guard = config('permission.defaults.guard', 'web');
        $superAdminRole = \Spatie\Permission\Models\Role::findByName('super_admin', $guard);
        $department = Department::query()->create([
            'name' => 'Operations / Admin',
            'slug' => 'operations',
            'default_module' => 'workspace',
            'is_active' => true,
        ]);

        $superAdmin = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        UserDepartmentRole::query()->create([
            'user_id' => $superAdmin->id,
            'department_id' => $department->id,
            'role_id' => $superAdminRole->id,
            'is_primary' => true,
            'assigned_at' => now(),
        ]);

        // Simulate stale Spatie sync (department role assigned, model_has_roles empty).
        $superAdmin->syncRoles([]);

        Sanctum::actingAs($superAdmin->fresh());

        $this->getJson('/api/v1/crm/leads')->assertOk();
    }

    public function test_operations_manager_can_access_crm_endpoints(): void
    {
        $operationsManager = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $operationsManager->assignRole('operations_manager');

        Sanctum::actingAs($operationsManager);

        $this->getJson('/api/v1/crm/leads')->assertOk();
        $this->getJson('/api/v1/crm/contacts')->assertOk();
        $this->getJson('/api/v1/crm/accounts')->assertOk();
    }

    public function test_lead_creation_without_contact_skips_contact_record(): void
    {
        Sanctum::actingAs($this->salesRep);

        $response = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Upcoming Karen Tower',
            'site_name' => 'Karen Tower',
            'site_address' => 'Karen, Nairobi',
            'subcounty' => 'Langata',
            'ward' => 'Karen Ward',
            'county_id' => DB::table('crm_counties')->where('slug', 'nairobi')->value('id'),
        ]);

        $response->assertCreated();
        $leadId = $response->json('data.id');

        $this->assertDatabaseHas('leads', [
            'id' => $leadId,
            'name' => 'Upcoming Karen Tower',
            'subcounty' => 'Langata',
            'ward' => 'Karen Ward',
        ]);

        $this->assertDatabaseMissing('contacts', [
            'source_lead_id' => $leadId,
        ]);
    }

    public function test_lead_creation_with_contact_creates_contact_record(): void
    {
        Sanctum::actingAs($this->salesRep);

        $leadSourceId = DB::table('crm_lead_sources')->where('slug', 'website')->value('id');

        $response = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Karen Tower',
            'contact_person_name' => 'Jane Wanjiku',
            'phone' => '+254712345679',
            'email' => 'jane@example.co.ke',
            'lead_source_id' => $leadSourceId,
            'account_name' => 'Company XYZ',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Karen Tower')
            ->assertJsonPath('data.contact_person_name', 'Jane Wanjiku')
            ->assertJsonPath('data.first_name', 'Jane')
            ->assertJsonPath('data.last_name', 'Wanjiku')
            ->assertJsonPath('data.company', 'Company XYZ')
            ->assertJsonPath('data.source', 'website')
            ->assertJsonPath('data.lead_source.slug', 'website')
            ->assertJsonPath('data.source_contact.name', 'Jane Wanjiku')
            ->assertJsonPath('data.converted_contact_id', null);

        $leadId = $response->json('data.id');

        $this->assertDatabaseHas('contacts', [
            'source_lead_id' => $leadId,
            'name' => 'Jane Wanjiku',
            'phone' => '+254712345679',
        ]);
    }

    public function test_manual_contact_linked_to_lead_appears_in_lead_linked_contacts(): void
    {
        Sanctum::actingAs($this->salesRep);

        $leadSourceId = DB::table('crm_lead_sources')->where('slug', 'website')->value('id');

        $leadResponse = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Karen Tower',
            'contact_person_name' => 'Jane Wanjiku',
            'phone' => '+254712345679',
            'email' => 'jane@example.co.ke',
            'lead_source_id' => $leadSourceId,
            'account_name' => 'Company XYZ',
        ]);

        $leadResponse->assertCreated();
        $leadId = $leadResponse->json('data.id');

        $contactResponse = $this->postJson('/api/v1/crm/contacts', [
            'name' => 'Peter Kamau',
            'email' => 'peter@example.co.ke',
            'phone' => '+254700111222',
            'source_lead_id' => $leadId,
        ]);

        $contactResponse->assertCreated()
            ->assertJsonPath('data.source_lead_id', $leadId);

        $this->getJson("/api/v1/crm/leads/{$leadId}")
            ->assertOk()
            ->assertJsonPath('data.linked_contacts.0.name', 'Jane Wanjiku')
            ->assertJsonPath('data.linked_contacts.1.name', 'Peter Kamau')
            ->assertJsonCount(2, 'data.linked_contacts');
    }

    public function test_site_only_lead_does_not_split_name_into_first_and_last(): void
    {
        Sanctum::actingAs($this->salesRep);

        $response = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Kilimani view point apartments',
            'site_name' => 'Kilimani view point apartments',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Kilimani view point apartments')
            ->assertJsonPath('data.first_name', 'Kilimani view point apartments')
            ->assertJsonPath('data.last_name', null);
    }

    public function test_lead_status_patch_cannot_skip_documented_stages(): void
    {
        Sanctum::actingAs($this->salesRep);

        $lead = Lead::query()->create([
            'reference' => 'LD-SKIP-001',
            'lead_number' => 'LD-SKIP-001',
            'name' => 'Skip Guard Lead',
            'first_name' => 'Skip',
            'status' => LeadStatus::Contacted,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $this->patchJson("/api/v1/crm/leads/{$lead->id}/status", [
            'status' => LeadStatus::Qualified->value,
        ])->assertStatus(422);

        $this->patchJson("/api/v1/crm/leads/{$lead->id}/status", [
            'status' => LeadStatus::Interested->value,
        ])->assertOk();

        $this->patchJson("/api/v1/crm/leads/{$lead->id}/status", [
            'status' => LeadStatus::Qualified->value,
        ])->assertStatus(422);

        $this->patchJson("/api/v1/crm/leads/{$lead->id}/status", [
            'status' => LeadStatus::SiteVisitScheduled->value,
        ])->assertStatus(422);
    }

    public function test_account_creation_rejected_for_unqualified_lead(): void
    {
        Sanctum::actingAs($this->salesRep);

        $leadId = Lead::query()->create([
            'reference' => 'LD-TEST-001',
            'lead_number' => 'LD-TEST-001',
            'name' => 'Unqualified Site',
            'first_name' => 'Unqualified',
            'status' => LeadStatus::New,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ])->id;

        $this->postJson('/api/v1/crm/accounts', [
            'name' => 'Should Fail Ltd',
            'source_lead_id' => $leadId,
        ])->assertStatus(422);

        $leadIdQualified = Lead::query()->create([
            'reference' => 'LD-TEST-002',
            'lead_number' => 'LD-TEST-002',
            'name' => 'Qualified Site',
            'first_name' => 'Qualified',
            'status' => LeadStatus::Qualified,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ])->id;

        $this->postJson('/api/v1/crm/accounts', [
            'name' => 'Qualified Account Ltd',
            'source_lead_id' => $leadIdQualified,
        ])->assertCreated();
    }

    public function test_lead_index_includes_linked_contact_fields_when_lead_contact_empty(): void
    {
        Sanctum::actingAs($this->salesRep);

        $lead = Lead::query()->create([
            'reference' => 'LD-LINKED-001',
            'lead_number' => 'LD-LINKED-001',
            'name' => 'Jambo Apartments',
            'first_name' => 'Jambo',
            'last_name' => 'Apartments',
            'product_interests' => ['blinds'],
            'requirement_description' => 'Test',
            'need_site_visit' => false,
            'status' => LeadStatus::New->value,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $account = Account::query()->create([
            'account_number' => 'AC-LINKED-001',
            'name' => 'Tarus Designs',
            'status' => 'active',
            'account_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        Contact::query()->create([
            'contact_number' => 'CT-LINKED-001',
            'name' => 'Tarus Contact',
            'first_name' => 'Tarus',
            'last_name' => 'Contact',
            'email' => 'tarus@example.com',
            'phone' => '+254711111111',
            'status' => 'new_contact',
            'account_id' => $account->id,
            'source_lead_id' => $lead->id,
            'contact_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $this->getJson('/api/v1/crm/leads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $lead->id)
            ->assertJsonPath('data.0.email', null)
            ->assertJsonPath('data.0.phone', null)
            ->assertJsonPath('data.0.linked_contacts.0.email', 'tarus@example.com')
            ->assertJsonPath('data.0.linked_contacts.0.phone', '+254711111111')
            ->assertJsonPath('data.0.linked_contacts.0.account.name', 'Tarus Designs');
    }
}
