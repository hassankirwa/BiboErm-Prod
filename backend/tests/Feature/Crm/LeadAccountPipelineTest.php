<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeadAccountPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            CrmLookupSeeder::class,
        ]);

        $this->salesUser = User::factory()->create();
        $this->salesUser->assignRole('sales_representative');
    }

    public function test_provision_account_endpoint_creates_account_and_updates_pipeline(): void
    {
        Sanctum::actingAs($this->salesUser);

        $lead = Lead::query()->create([
            'reference' => 'LD-ACC-001',
            'lead_number' => 'LD-ACC-001',
            'name' => 'Pipeline Account Lead',
            'first_name' => 'Pipeline',
            'contact_person_name' => 'Pipeline Client',
            'phone' => '+254712345678',
            'account_name' => 'Pipeline Account Lead',
            'status' => LeadStatus::Interested->value,
            'pipeline_stage' => LeadPipelineStage::ContactConfirmed->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->postJson("/api/v1/crm/leads/{$lead->id}/provision-account");

        $response->assertCreated()
            ->assertJsonPath('data.lead.pipeline_stage', LeadPipelineStage::AccountProvisioned->value)
            ->assertJsonPath('data.lead.status', LeadStatus::AccountCreated->value);

        $lead->refresh();

        $this->assertNotNull($lead->converted_account_id);
        $this->assertSame(LeadPipelineStage::AccountProvisioned->value, $lead->pipeline_stage->value);
    }

    public function test_site_visit_schedule_requires_account(): void
    {
        Sanctum::actingAs($this->salesUser);

        $lead = Lead::query()->create([
            'reference' => 'LD-ACC-002',
            'lead_number' => 'LD-ACC-002',
            'name' => 'No Account Lead',
            'first_name' => 'No',
            'status' => LeadStatus::Interested->value,
            'pipeline_stage' => LeadPipelineStage::ContactConfirmed->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $this->postJson('/api/v1/crm/site-visits', [
            'title' => 'Blocked visit',
            'lead_id' => $lead->id,
            'assigned_field_officer_id' => $this->salesUser->id,
            'visit_date' => now()->toDateString(),
            'site_address' => 'Nairobi',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lead_id']);
    }

    public function test_existing_client_lead_links_account_and_sets_pipeline(): void
    {
        Sanctum::actingAs($this->salesUser);

        $account = Account::query()->create([
            'account_number' => 'AC-EXIST001',
            'name' => 'Returning Client Ltd',
            'status' => 'active',
            'account_owner_id' => $this->salesUser->id,
            'owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $contact = Contact::query()->create([
            'contact_number' => 'CT-EXIST001',
            'name' => 'Returning Contact',
            'first_name' => 'Returning',
            'phone' => '+254700000001',
            'email' => 'returning@example.com',
            'status' => 'active',
            'account_id' => $account->id,
            'contact_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $account->update(['primary_contact_id' => $contact->id]);

        $response = $this->postJson('/api/v1/crm/leads', [
            'name' => 'New kitchen blinds project',
            'existing_account_id' => $account->id,
            'requirement_description' => 'Repeat client kitchen project',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.pipeline_stage', LeadPipelineStage::AccountProvisioned->value)
            ->assertJsonPath('data.converted_account_id', $account->id)
            ->assertJsonPath('data.contact_person_name', 'Returning Contact')
            ->assertJsonPath('data.phone', '+254700000001');
    }

    public function test_existing_client_lead_does_not_inherit_prior_quote_or_deal(): void
    {
        Sanctum::actingAs($this->salesUser);

        $priorLead = Lead::query()->create([
            'reference' => 'LD-PRIOR-001',
            'lead_number' => 'LD-PRIOR-001',
            'name' => 'Original blinds project',
            'first_name' => 'Original',
            'status' => LeadStatus::Converted->value,
            'pipeline_stage' => LeadPipelineStage::ProformaSent->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $account = Account::query()->create([
            'account_number' => 'AC-EXIST002',
            'name' => 'Returning Client With History',
            'status' => 'active',
            'source_lead_id' => $priorLead->id,
            'account_owner_id' => $this->salesUser->id,
            'owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $contact = Contact::query()->create([
            'contact_number' => 'CT-EXIST002',
            'name' => 'History Contact',
            'first_name' => 'History',
            'phone' => '+254700000002',
            'email' => 'history@example.com',
            'status' => 'active',
            'account_id' => $account->id,
            'source_lead_id' => $priorLead->id,
            'contact_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $account->update(['primary_contact_id' => $contact->id]);

        $priorLead->update([
            'converted_account_id' => $account->id,
            'converted_contact_id' => $contact->id,
        ]);

        $priorDeal = Deal::query()->create([
            'reference' => 'DL-PRIOR-001',
            'deal_number' => 'DL-PRIOR-001',
            'title' => 'Prior opportunity',
            'name' => 'Prior opportunity',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'source_lead_id' => $priorLead->id,
            'stage' => DealStage::QuotationSent->value,
            'status' => 'open',
            'amount' => 500000,
            'owner_id' => $this->salesUser->id,
            'deal_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $priorQuotation = Quotation::query()->create([
            'quotation_number' => 'QT-PRIOR-001',
            'deal_id' => $priorDeal->id,
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'project_name' => 'Prior blinds install',
            'status' => QuotationStatus::Sent->value,
            'subtotal' => 500000,
            'tax_amount' => 0,
            'total_amount' => 500000,
            'sent_at' => now(),
            'prepared_by' => $this->salesUser->id,
        ]);

        $priorLead->update(['converted_deal_id' => $priorDeal->id]);

        SiteVisit::query()->create([
            'visit_number' => 'SV-PRIOR-001',
            'title' => 'Prior site measurements',
            'lead_id' => $priorLead->id,
            'account_id' => $account->id,
            'assigned_field_officer_id' => $this->salesUser->id,
            'scheduled_by' => $this->salesUser->id,
            'visit_date' => now()->subMonth()->toDateString(),
            'status' => SiteVisitStatus::Approved->value,
        ]);

        $create = $this->postJson('/api/v1/crm/leads', [
            'name' => 'Second kitchen project',
            'existing_account_id' => $account->id,
            'requirement_description' => 'New opportunity for returning client',
        ]);

        $create->assertCreated()
            ->assertJsonPath('data.pipeline_stage', LeadPipelineStage::AccountProvisioned->value)
            ->assertJsonPath('data.converted_account_id', $account->id)
            ->assertJsonPath('data.converted_deal_id', null);

        $newLeadId = (int) $create->json('data.id');

        $show = $this->getJson("/api/v1/crm/leads/{$newLeadId}");

        $show->assertOk()
            ->assertJsonPath('data.pipeline_stage', LeadPipelineStage::AccountProvisioned->value)
            ->assertJsonPath('data.converted_deal_id', null)
            ->assertJsonPath('data.site_visits', [])
            ->assertJsonMissingPath('data.latest_quotation')
            ->assertJsonMissingPath('data.sales_deal');

        $this->assertDatabaseHas('leads', [
            'id' => $newLeadId,
            'converted_account_id' => $account->id,
            'converted_deal_id' => null,
            'pipeline_stage' => LeadPipelineStage::AccountProvisioned->value,
        ]);

        // Prior opportunity remains linked only to the original lead.
        $this->assertDatabaseHas('leads', [
            'id' => $priorLead->id,
            'converted_deal_id' => $priorDeal->id,
        ]);
        $this->assertSame($priorQuotation->id, Quotation::query()->where('deal_id', $priorDeal->id)->value('id'));
    }
}
