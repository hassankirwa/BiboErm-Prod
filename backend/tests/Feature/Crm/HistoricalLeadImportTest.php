<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\LeadStatus;
use App\Models\Lead;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HistoricalLeadImportTest extends TestCase
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

    public function test_historical_import_creates_won_and_open_leads_without_account(): void
    {
        Sanctum::actingAs($this->salesUser);

        $response = $this->postJson('/api/v1/crm/leads/import-historical', [
            'leads' => [
                [
                    'name' => 'Kennedy',
                    'phone' => '722951966',
                    'progress' => 'Won',
                    'project_name' => 'Kimilili',
                    'source' => 'Walk-in',
                    'estimated_value' => 7779503.9,
                    'quote_date' => '2026-07-18',
                    'external_quote_no' => '2026070760',
                    'series' => 'S50CW',
                    'sales_rep' => 'PERIS',
                ],
                [
                    'name' => 'John Mwangi',
                    'phone' => '+254 712 345 678',
                    'progress' => 'Sent',
                    'project_name' => 'Riverside Villa',
                    'estimated_value' => 1250000,
                    'quote_date' => '2026-07-18',
                    'external_quote_no' => 'Q-2026-001',
                ],
                [
                    'name' => 'Lost Client',
                    'phone' => '700000001',
                    'progress' => 'Lost',
                    'external_quote_no' => 'LOST-1',
                ],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.imported', 2)
            ->assertJsonPath('data.skipped', 1);

        $won = Lead::query()->where('external_quote_no', '2026070760')->first();
        $this->assertNotNull($won);
        $this->assertTrue($won->is_historical);
        $this->assertSame(LeadPipelineStage::DealWon, $won->pipeline_stage);
        $this->assertSame(LeadStatus::Converted, $won->status);
        $this->assertSame('7779503.90', (string) $won->amount_paid);
        $this->assertNull($won->converted_account_id);

        $sent = Lead::query()->where('external_quote_no', 'Q-2026-001')->first();
        $this->assertNotNull($sent);
        $this->assertSame(LeadPipelineStage::ProformaSent, $sent->pipeline_stage);
        $this->assertSame(LeadStatus::Interested, $sent->status);
        $this->assertNull($sent->amount_paid);
        $this->assertNull($sent->converted_account_id);

        $this->assertNull(Lead::query()->where('external_quote_no', 'LOST-1')->first());
    }

    public function test_historical_import_skips_duplicate_phone_and_quote_no(): void
    {
        Sanctum::actingAs($this->salesUser);

        Lead::query()->create([
            'reference' => 'LD-EXIST-001',
            'lead_number' => 'LD-EXIST-001',
            'name' => 'Existing',
            'first_name' => 'Existing',
            'phone' => '0722951966',
            'status' => LeadStatus::New->value,
            'pipeline_stage' => LeadPipelineStage::NewLead->value,
            'external_quote_no' => 'DUP-QUOTE',
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->postJson('/api/v1/crm/leads/import-historical', [
            'leads' => [
                [
                    'name' => 'Kennedy Dup Phone',
                    'phone' => '722951966',
                    'progress' => 'Won',
                    'estimated_value' => 1000,
                    'external_quote_no' => 'NEW-1',
                ],
                [
                    'name' => 'Other Client',
                    'phone' => '711111111',
                    'progress' => 'Sent',
                    'estimated_value' => 2000,
                    'external_quote_no' => 'DUP-QUOTE',
                ],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.imported', 0)
            ->assertJsonPath('data.skipped', 2);
    }

    public function test_historical_won_lead_can_provision_account(): void
    {
        Sanctum::actingAs($this->salesUser);

        $lead = Lead::query()->create([
            'reference' => 'LD-HIST-WON',
            'lead_number' => 'LD-HIST-WON',
            'name' => 'Historical Won Client',
            'first_name' => 'Historical',
            'contact_person_name' => 'Historical Won Client',
            'phone' => '+254700111222',
            'account_name' => 'Historical Won Client',
            'status' => LeadStatus::Converted->value,
            'pipeline_stage' => LeadPipelineStage::DealWon->value,
            'is_historical' => true,
            'amount_paid' => 1500000,
            'quote_date' => '2026-04-22',
            'external_quote_no' => '2026040610',
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->postJson("/api/v1/crm/leads/{$lead->id}/provision-account");

        $response->assertCreated()
            ->assertJsonPath('data.lead.status', LeadStatus::AccountCreated->value);

        $lead->refresh();
        $this->assertNotNull($lead->converted_account_id);
        // Historical won stays at deal_won (pipeline does not move backwards).
        $this->assertSame(LeadPipelineStage::DealWon->value, $lead->pipeline_stage->value);
    }

    public function test_new_lead_still_cannot_provision_account(): void
    {
        Sanctum::actingAs($this->salesUser);

        $lead = Lead::query()->create([
            'reference' => 'LD-NEW-BLOCK',
            'lead_number' => 'LD-NEW-BLOCK',
            'name' => 'Brand New',
            'first_name' => 'Brand',
            'phone' => '+254700333444',
            'status' => LeadStatus::New->value,
            'pipeline_stage' => LeadPipelineStage::NewLead->value,
            'lead_owner_id' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $this->postJson("/api/v1/crm/leads/{$lead->id}/provision-account")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lead']);
    }
}
