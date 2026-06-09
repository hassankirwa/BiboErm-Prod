<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\LeadStatus;
use App\Jobs\Crm\CreateAccountFromLead;
use App\Models\Account;
use App\Models\Lead;
use App\Models\User;
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

    public function test_lead_conversion_rejects_deal_creation(): void
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
}
