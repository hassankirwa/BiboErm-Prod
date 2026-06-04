<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\DealStage;
use App\Enums\Crm\LeadStatus;
use App\Enums\Crm\QuotationStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\CrmActivity;
use App\Models\Deal;
use App\Models\DealPayment;
use App\Models\Lead;
use App\Models\Quotation;
use App\Models\SiteVisit;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CrmSalesReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

    protected User $otherRep;

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

        $this->salesRep = User::factory()->create(['status' => User::STATUS_ACTIVE, 'name' => 'Sales Rep One']);
        $this->salesRep->assignRole('sales_representative');

        $this->otherRep = User::factory()->create(['status' => User::STATUS_ACTIVE, 'name' => 'Sales Rep Two']);
        $this->otherRep->assignRole('sales_representative');
    }

    public function test_sales_reports_dashboard_returns_expected_sections(): void
    {
        $walkIn = DB::table('crm_lead_sources')->where('slug', 'walk_in')->value('id');

        Lead::query()->create([
            'reference' => 'LD-RPT-001',
            'lead_number' => 'LD-RPT-001',
            'name' => 'Report Lead',
            'first_name' => 'Alice',
            'last_name' => 'Report',
            'contact_person_name' => 'Alice',
            'phone' => '+254700000010',
            'product_interests' => ['blinds'],
            'requirement_description' => 'Test lead',
            'need_site_visit' => false,
            'status' => LeadStatus::Qualified->value,
            'lead_source_id' => $walkIn,
            'source' => 'walk_in',
            'estimated_value' => 100000,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
            'converted_at' => now(),
        ]);

        Lead::query()->create([
            'reference' => 'LD-RPT-002',
            'lead_number' => 'LD-RPT-002',
            'name' => 'Open Lead',
            'first_name' => 'Bob',
            'last_name' => 'Open',
            'contact_person_name' => 'Bob',
            'phone' => '+254700000011',
            'product_interests' => ['glass'],
            'requirement_description' => 'Test lead',
            'need_site_visit' => false,
            'status' => LeadStatus::New->value,
            'lead_source_id' => $walkIn,
            'source' => 'walk_in',
            'estimated_value' => 50000,
            'lead_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        Deal::query()->create([
            'reference' => 'DL-RPT-001',
            'deal_number' => 'DL-RPT-001',
            'title' => 'Open Pipeline Deal',
            'stage' => DealStage::QuotationSent->value,
            'estimated_value' => 250000,
            'deal_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        Deal::query()->create([
            'reference' => 'DL-RPT-002',
            'deal_number' => 'DL-RPT-002',
            'title' => 'Won Deal',
            'stage' => DealStage::Won->value,
            'estimated_value' => 300000,
            'won_at' => now(),
            'deal_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        Deal::query()->create([
            'reference' => 'DL-RPT-003',
            'deal_number' => 'DL-RPT-003',
            'title' => 'Lost Deal',
            'stage' => DealStage::Lost->value,
            'estimated_value' => 120000,
            'lost_at' => now(),
            'deal_owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        $wonDeal = Deal::query()->where('reference', 'DL-RPT-002')->firstOrFail();

        $account = Account::query()->create([
            'name' => 'Report Account',
            'phone' => '+254700000099',
        ]);

        $contact = Contact::query()->create([
            'name' => 'Report Contact',
            'first_name' => 'Report',
            'last_name' => 'Contact',
            'phone' => '+254700000099',
            'account_id' => $account->id,
        ]);

        Quotation::query()->create([
            'quotation_number' => 'QT-RPT-001',
            'deal_id' => $wonDeal->id,
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'prepared_by' => $this->salesRep->id,
            'status' => QuotationStatus::Accepted->value,
            'subtotal' => 300000,
            'total_amount' => 300000,
            'accepted_at' => now(),
        ]);

        DealPayment::query()->create([
            'deal_id' => $wonDeal->id,
            'quotation_id' => Quotation::query()->where('quotation_number', 'QT-RPT-001')->value('id'),
            'payment_reference' => 'PAY-RPT-001',
            'payment_date' => now()->toDateString(),
            'amount_paid' => 150000,
            'payment_method' => 'mpesa',
            'payment_status' => 'confirmed',
            'received_by' => $this->salesRep->id,
        ]);

        $openLead = Lead::query()->where('reference', 'LD-RPT-002')->firstOrFail();

        $fieldOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $fieldOfficer->assignRole('field_officer');

        SiteVisit::query()->create([
            'visit_number' => 'SV-RPT-001',
            'title' => 'Karen Site Visit',
            'lead_id' => $openLead->id,
            'site_address' => 'Karen, Nairobi',
            'assigned_field_officer_id' => $fieldOfficer->id,
            'scheduled_by' => $this->otherRep->id,
            'visit_date' => now()->addDays(3)->toDateString(),
            'status' => 'scheduled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        SiteVisit::query()->create([
            'visit_number' => 'SV-RPT-002',
            'title' => 'Westlands Visit',
            'lead_id' => $openLead->id,
            'site_address' => 'Westlands',
            'assigned_field_officer_id' => $fieldOfficer->id,
            'scheduled_by' => $this->otherRep->id,
            'visit_date' => now()->subMonths(2)->toDateString(),
            'status' => 'scheduled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        CrmActivity::query()->create([
            'type' => 'call',
            'activity_type' => 'call',
            'subject' => 'Follow up call',
            'status' => 'completed',
            'completed_at' => now(),
            'lead_id' => $openLead->id,
            'activitable_type' => Lead::class,
            'activitable_id' => $openLead->id,
            'assigned_to' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
        ]);

        Sanctum::actingAs($this->salesRep);

        $this->assertDatabaseHas('deal_payments', [
            'payment_reference' => 'PAY-RPT-001',
            'amount_paid' => 150000,
        ]);

        $periodFrom = now()->startOfMonth()->toDateString();
        $periodTo = now()->toDateString();

        $response = $this->getJson('/api/v1/crm/reports/dashboard?from='.$periodFrom.'&to='.$periodTo);

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'period' => ['from', 'to'],
                    'filters' => ['owner_id'],
                    'kpis' => [
                        'total_leads',
                        'open_leads',
                        'converted_leads',
                        'lead_conversion_rate',
                        'open_deals',
                        'deals_created',
                        'pipeline_value',
                        'won_deals',
                        'lost_deals',
                        'won_revenue',
                        'win_rate',
                        'avg_deal_size',
                        'quotations_sent',
                        'quotations_accepted',
                        'activities_total',
                        'activities_completed',
                        'site_visits',
                        'payments_received',
                    ],
                    'pipeline_by_stage',
                    'leads_by_status',
                    'leads_by_source',
                    'activities_by_type',
                    'quotations_by_status',
                    'top_performers',
                ],
            ]);

        $kpis = $response->json('data.kpis');
        $this->assertSame(2, $kpis['total_leads']);
        $this->assertSame(1, $kpis['converted_leads']);
        $this->assertSame(1, $kpis['open_deals']);
        $this->assertSame(250000.0, (float) $kpis['pipeline_value']);
        $this->assertSame(1, $kpis['won_deals']);
        $this->assertSame(1, $kpis['lost_deals']);
        $this->assertSame(300000.0, (float) $kpis['won_revenue']);
        $this->assertSame(150000.0, (float) $kpis['payments_received']);
        $this->assertSame(2, $kpis['site_visits']);
        $this->assertNotEmpty($response->json('data.pipeline_by_stage'));
        $this->assertNotEmpty($response->json('data.top_performers'));
    }

    public function test_sales_reports_dashboard_scopes_to_visible_records(): void
    {
        Deal::query()->create([
            'reference' => 'DL-RPT-OTHER',
            'deal_number' => 'DL-RPT-OTHER',
            'title' => 'Other Rep Deal',
            'stage' => DealStage::Won->value,
            'estimated_value' => 999999,
            'won_at' => now(),
            'deal_owner_id' => $this->otherRep->id,
            'created_by' => $this->otherRep->id,
        ]);

        Sanctum::actingAs($this->salesRep);

        $response = $this->getJson('/api/v1/crm/reports/dashboard');

        $response->assertOk();
        $this->assertSame(0, $response->json('data.kpis.won_deals'));
        $this->assertSame(0.0, (float) $response->json('data.kpis.won_revenue'));
    }

    public function test_sales_reports_dashboard_requires_crm_permission(): void
    {
        $user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/crm/reports/dashboard')->assertForbidden();
    }

    public function test_reports_catalog_endpoint_still_available(): void
    {
        Sanctum::actingAs($this->salesRep);

        $this->getJson('/api/v1/crm/reports')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'description', 'folder', 'record_count']]]);
    }
}
