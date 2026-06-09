<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\QuotationStatus;
use App\Enums\Crm\SiteVisitStatus;
use App\Jobs\Crm\CreateAccountFromLead;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use App\Services\Crm\Leads\AccountProvisioningService;
use App\Services\Crm\Leads\LeadStageService;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmFlowV2Test extends TestCase
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

    public function test_interested_provisions_account_synchronously(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-001',
            'lead_number' => 'LD-V2-001',
            'name' => 'V2 Test Lead',
            'first_name' => 'V2',
            'status' => LeadStatus::Contacted->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        app(LeadStageService::class)->updateStatus(
            $lead,
            LeadStatus::Interested->value,
            $this->salesUser,
        );

        $lead->refresh();

        $this->assertSame(LeadStatus::AccountCreated->value, $lead->status->value);
        $this->assertNotNull($lead->converted_account_id);
    }

    public function test_manual_account_with_source_lead_links_lead(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-LINK',
            'lead_number' => 'LD-V2-LINK',
            'name' => 'Manual Link Lead',
            'first_name' => 'Manual',
            'account_name' => 'Manual Link Lead',
            'status' => LeadStatus::Interested->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->actingAs($this->salesUser)->postJson('/api/v1/crm/accounts', [
            'name' => 'Manual Link Lead',
            'source_lead_id' => $lead->id,
        ]);

        $response->assertCreated();

        $lead->refresh();

        $this->assertSame(LeadStatus::AccountCreated->value, $lead->status->value);
        $this->assertSame($response->json('data.id'), $lead->converted_account_id);
    }

    public function test_lead_show_reconciles_existing_source_lead_account(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-RECON',
            'lead_number' => 'LD-V2-RECON',
            'name' => 'Reconcile Lead',
            'first_name' => 'Reconcile',
            'status' => LeadStatus::Interested->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $account = Account::query()->create([
            'account_number' => 'AC-RECON001',
            'name' => 'Reconcile Lead',
            'status' => 'prospect',
            'account_owner_id' => $this->salesUser->id,
            'owner_id' => $this->salesUser->id,
            'source_lead_id' => $lead->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->actingAs($this->salesUser)->getJson("/api/v1/crm/leads/{$lead->id}");

        $response->assertOk();
        $this->assertSame('account_created', $response->json('data.status'));
        $this->assertSame($account->id, $response->json('data.converted_account_id'));

        $lead->refresh();
        $this->assertSame(LeadStatus::AccountCreated->value, $lead->status->value);
        $this->assertSame($account->id, $lead->converted_account_id);
    }

    public function test_account_provisioning_sets_account_created(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-002',
            'lead_number' => 'LD-V2-002',
            'name' => 'Test Client Ltd',
            'first_name' => 'Test',
            'account_name' => 'Test Client Ltd',
            'phone' => '+254712345678',
            'status' => LeadStatus::Interested->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $job = new CreateAccountFromLead($lead->id, $this->salesUser->id);
        $job->handle(app(\App\Services\Crm\Leads\AccountProvisioningService::class));

        $lead->refresh();

        $this->assertSame(LeadStatus::AccountCreated->value, $lead->status->value);
        $this->assertNotNull($lead->converted_account_id);
        $this->assertDatabaseHas('accounts', [
            'id' => $lead->converted_account_id,
            'name' => 'Test Client Ltd',
        ]);
    }

    public function test_lead_show_provisions_interested_lead_without_account(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-PROV',
            'lead_number' => 'LD-V2-PROV',
            'name' => 'Provision On Show',
            'first_name' => 'Provision',
            'account_name' => 'Provision On Show',
            'status' => LeadStatus::Interested->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->actingAs($this->salesUser)->getJson("/api/v1/crm/leads/{$lead->id}");

        $response->assertOk();
        $this->assertSame('account_created', $response->json('data.status'));
        $this->assertNotNull($response->json('data.converted_account_id'));
    }

    public function test_lead_conversion_rejects_deal_creation_flag_on_provision(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-003',
            'lead_number' => 'LD-V2-003',
            'name' => 'Convert Guard Lead',
            'first_name' => 'Convert',
            'status' => LeadStatus::Interested->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->actingAs($this->salesUser)->postJson("/api/v1/crm/leads/{$lead->id}/convert", [
            'create_deal' => true,
        ]);

        $response->assertStatus(422);
    }

    public function test_convert_with_account_records_deposit_and_creates_deal_from_draft_quotation(): void
    {
        $contact = Contact::query()->create([
            'first_name' => 'Deposit',
            'last_name' => 'Client',
            'name' => 'Deposit Client',
            'phone' => '+254700000011',
            'status' => 'active',
        ]);

        $lead = Lead::query()->create([
            'reference' => 'LD-V2-DEP',
            'lead_number' => 'LD-V2-DEP',
            'name' => 'Kasarani Lakeview Apartments',
            'first_name' => 'Kasarani',
            'account_name' => 'Kasarani Lakeview Apartments',
            'status' => LeadStatus::Interested->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        (new CreateAccountFromLead($lead->id, $this->salesUser->id))
            ->handle(app(AccountProvisioningService::class));

        $lead->refresh();
        $accountId = $lead->converted_account_id;
        $this->assertNotNull($accountId);

        Account::query()->whereKey($accountId)->update([
            'primary_contact_id' => $contact->id,
            'source_lead_id' => $lead->id,
        ]);

        $quotationResponse = $this->actingAs($this->salesUser)->postJson("/api/v1/crm/accounts/{$accountId}/quotations", [
            'lines' => [
                [
                    'description' => 'Lakeview blinds package',
                    'quantity' => 1,
                    'unit_price' => 750000,
                ],
            ],
        ]);

        $quotationResponse->assertCreated();
        $quotation = Quotation::query()->findOrFail($quotationResponse->json('data.id'));
        $quotation->update([
            'quotation_number' => 'QT-K7GIPWC7',
            'revision_number' => 2,
        ]);

        SiteVisit::query()->create([
            'visit_number' => 'SV-V2-DEP-001',
            'title' => 'Kasarani site visit',
            'lead_id' => $lead->id,
            'account_id' => $accountId,
            'assigned_field_officer_id' => $this->salesUser->id,
            'scheduled_by' => $this->salesUser->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::Approved->value,
        ]);

        $this->actingAs($this->salesUser)
            ->postJson("/api/v1/crm/quotations/{$quotation->id}/send")
            ->assertOk();

        $quotation->refresh();

        $response = $this->actingAs($this->salesUser)->postJson("/api/v1/crm/leads/{$lead->id}/convert", [
            'quotation_id' => $quotation->id,
            'payment_reference' => 'MPESA-KASARANI-001',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 375000,
            'payment_method' => 'mpesa',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.deal.id', fn ($id) => $id !== null)
            ->assertJsonPath('data.payment.payment_reference', 'MPESA-KASARANI-001');

        $lead->refresh();
        $quotation->refresh();

        $this->assertNotNull($lead->converted_deal_id);
        $this->assertSame($lead->converted_deal_id, $quotation->deal_id);
        $this->assertSame(QuotationStatus::Accepted->value, $quotation->status->value);
        $this->assertNotNull($quotation->accepted_at);

        $deal = Deal::query()->findOrFail($lead->converted_deal_id);
        $this->assertSame('won', $deal->status);
        $this->assertNotNull($deal->won_at);
        $this->assertContains(
            $deal->stage->value,
            [DealStage::Won->value, DealStage::ProjectCreated->value],
        );
        $this->assertDatabaseHas('deal_payments', [
            'deal_id' => $deal->id,
            'payment_reference' => 'MPESA-KASARANI-001',
            'amount_paid' => 375000,
        ]);
    }

    public function test_convert_with_account_requires_approved_visit_and_sent_quotation(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-GATE',
            'lead_number' => 'LD-V2-GATE',
            'name' => 'Gated Convert Lead',
            'first_name' => 'Gated',
            'status' => LeadStatus::AccountCreated->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $account = Account::query()->create([
            'account_number' => 'AC-GATE01',
            'name' => 'Gated Convert Lead',
            'status' => 'prospect',
            'account_owner_id' => $this->salesUser->id,
            'owner_id' => $this->salesUser->id,
            'source_lead_id' => $lead->id,
            'created_by' => $this->salesUser->id,
        ]);

        $lead->update(['converted_account_id' => $account->id]);

        $this->actingAs($this->salesUser)
            ->postJson("/api/v1/crm/leads/{$lead->id}/convert", [
                'payment_reference' => 'MPESA-GATE-001',
                'payment_date' => now()->toDateString(),
                'amount_paid' => 100000,
                'payment_method' => 'mpesa',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_convert_with_account_requires_payment_fields(): void
    {
        $lead = Lead::query()->create([
            'reference' => 'LD-V2-NOPAY',
            'lead_number' => 'LD-V2-NOPAY',
            'name' => 'No Payment Lead',
            'first_name' => 'No',
            'status' => LeadStatus::AccountCreated->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $account = Account::query()->create([
            'account_number' => 'AC-NOPAY01',
            'name' => 'No Payment Lead',
            'status' => 'prospect',
            'account_owner_id' => $this->salesUser->id,
            'owner_id' => $this->salesUser->id,
            'source_lead_id' => $lead->id,
            'created_by' => $this->salesUser->id,
        ]);

        $lead->update(['converted_account_id' => $account->id]);

        $this->actingAs($this->salesUser)
            ->postJson("/api/v1/crm/leads/{$lead->id}/convert", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payment_reference', 'payment_date', 'amount_paid', 'payment_method']);
    }
}
