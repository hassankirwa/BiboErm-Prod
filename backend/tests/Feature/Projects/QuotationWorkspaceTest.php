<?php

namespace Tests\Feature\Projects;

use App\Enums\Crm\LeadPipelineStage;
use App\Enums\Crm\SiteVisitStatus;
use App\Enums\Design\DesignJobStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\DesignJob;
use App\Models\Lead;
use App\Models\MeasurementReport;
use App\Models\QuotationRequest;
use App\Models\SiteVisit;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class QuotationWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

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

        $this->user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->user->assignRole('sales_representative');
    }

    protected function createAccountWithApprovedVisit(): Account
    {
        $contact = Contact::query()->create([
            'first_name' => 'Beatrice',
            'last_name' => 'Client',
            'name' => 'Beatrice Client',
            'phone' => '+254700000001',
            'status' => 'active',
        ]);

        $account = Account::query()->create([
            'account_number' => 'ACC-'.random_int(1000, 9999),
            'name' => 'Beatrice Residence',
            'status' => 'awaiting_quotation',
            'primary_contact_id' => $contact->id,
            'owner_id' => $this->user->id,
            'account_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $lead = Lead::query()->create([
            'reference' => 'LD-QW-001',
            'lead_number' => 'LD-QW-001',
            'name' => 'Beatrice Residence',
            'first_name' => 'Beatrice',
            'phone' => '+254700000001',
            'contact_person_name' => 'Beatrice Client',
            'status' => 'interested',
            'pipeline_stage' => LeadPipelineStage::ReadyForQuotation->value,
            'converted_account_id' => $account->id,
            'lead_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $account->update(['source_lead_id' => $lead->id]);

        $visit = SiteVisit::query()->create([
            'visit_number' => 'SV-TEST001',
            'title' => 'Beatrice measurement visit',
            'lead_id' => $lead->id,
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'assigned_field_officer_id' => $this->user->id,
            'assigned_to_user_id' => $this->user->id,
            'scheduled_by' => $this->user->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::Approved->value,
            'approved_by' => $this->user->id,
            'approved_at' => now(),
        ]);

        $report = MeasurementReport::query()->create([
            'site_visit_id' => $visit->id,
            'lead_id' => $lead->id,
            'report_number' => 'MR-TEST001',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $designJob = DesignJob::query()->create([
            'design_job_number' => 'DJ-TEST001',
            'lead_id' => $lead->id,
            'site_visit_id' => $visit->id,
            'measurement_report_id' => $report->id,
            'status' => DesignJobStatus::ReadyForQuotation->value,
            'approved_at' => now(),
        ]);

        QuotationRequest::query()->create([
            'request_number' => 'QR-TEST001',
            'lead_id' => $lead->id,
            'design_job_id' => $designJob->id,
            'measurement_report_id' => $report->id,
            'status' => 'ready_for_quotation',
        ]);

        return $account;
    }

    public function test_pending_list_includes_account_with_ready_design_job_and_no_quotation(): void
    {
        Sanctum::actingAs($this->user);
        $account = $this->createAccountWithApprovedVisit();

        $response = $this->getJson('/api/v1/projects/quotations/pending');

        $response->assertOk();
        $response->assertJsonPath('data.0.id', $account->id);
        $response->assertJsonPath('data.0.name', $account->name);
    }

    public function test_quotation_extract_endpoint_parses_accounting_txt(): void
    {
        Sanctum::actingAs($this->user);

        $file = new UploadedFile(
            base_path('../docs/excel dump.txt'),
            'beatrice-accounting.txt',
            'text/plain',
            null,
            true,
        );

        $response = $this->post('/api/v1/projects/quotations/extract', [
            'file' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.project.name', 'BEATRICE');
        $response->assertJsonPath('data.project_name', 'BEATRICE');
        $response->assertJsonPath('data.summary.total_items', 4);
        $response->assertJsonPath('data.lines.0.code', 'SD-1');
        $response->assertJsonPath('data.lines.0.quantity', 1);
        $response->assertJsonPath('data.lines.0.unit_price', 392.24);
        $response->assertJsonPath('data.lines.0.line_total', 392.24);
        $response->assertJsonPath('data.lines.0.sqm_per_pcs', 3.05);
        $response->assertJsonPath('data.lines.1.code', 'SD-2');
        $response->assertJsonPath('data.lines.1.line_total', 681.93);
        $lineTotals = collect($response->json('data.lines'))->sum('line_total');
        $response->assertJsonPath('data.summary.grand_total', round($lineTotals, 2));
        $this->assertGreaterThan(0, $response->json('data.summary.tax'));
        $this->assertStringContainsString(
            'Bronze Reflective glass',
            (string) $response->json('data.lines.0.glass_type'),
        );
    }

    public function test_design_extract_endpoint_parses_fabrication_xls(): void
    {
        Sanctum::actingAs($this->user);

        $file = new UploadedFile(
            base_path('tests/Fixtures/BEATRICE_FABRICATION_LIST.xls'),
            'beatrice-fabrication.xls',
            'application/vnd.ms-excel',
            null,
            true,
        );

        $response = $this->post('/api/v1/design/extract', [
            'file' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.summary.total_items', 4);
        $response->assertJsonPath('data.items.0.code', 'SD-1');
        $response->assertJsonPath('data.project.name', 'BEATRICE');
        $response->assertJsonPath('data.items.0.drawing.elevation.height_mm', 2090);
        $response->assertJsonPath('data.project.delivery_date', '2026年05月21日');

        $mediaStatus = $response->json('data.items.0.drawing.embedded_media.status');
        if (extension_loaded('gd')) {
            $this->assertContains($mediaStatus, ['extracted', 'none_found']);
        } else {
            $response->assertJsonPath('data.items.0.drawing.embedded_media.status', 'requires_gd_extension');
        }
    }

    public function test_quotation_extract_merges_optional_fabrication_file(): void
    {
        Sanctum::actingAs($this->user);

        $accounting = new UploadedFile(
            base_path('../docs/excel dump.txt'),
            'beatrice-accounting.txt',
            'text/plain',
            null,
            true,
        );

        $fabrication = new UploadedFile(
            base_path('../docs/fabrication.txt'),
            'beatrice-fabrication.txt',
            'text/plain',
            null,
            true,
        );

        $response = $this->post('/api/v1/projects/quotations/extract', [
            'file' => $accounting,
            'fabrication_file' => $fabrication,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.lines.0.code', 'SD-1');
        $response->assertJsonPath('data.lines.0.width_mm', 1408);
        $response->assertJsonPath('data.lines.0.height_mm', 2090);
        $response->assertJsonPath('data.lines.3.code', 'SD-4');
        $response->assertJsonPath('data.lines.3.width_mm', 2828);
        $response->assertJsonPath('data.lines.3.height_mm', 1825);
        $this->assertArrayHasKey('fabrication', $response->json('data.lines.0.metadata'));
    }

    public function test_store_creates_structured_quotation_from_accounting_lines(): void
    {
        Sanctum::actingAs($this->user);
        $account = $this->createAccountWithApprovedVisit();

        $response = $this->postJson('/api/v1/projects/quotations', [
            'account_id' => $account->id,
            'project_name' => 'BEATRICE UPDATED QUOTE',
            'project_number' => '2026040613',
            'lines' => [
                [
                    'description' => 'S90 Sliding SD-1 — Bronze Reflective glass 6mm',
                    'series' => 'S90 Sliding 推拉门',
                    'code' => 'SD-1',
                    'glass_type' => 'Bronze Reflective glass 6mm',
                    'sqm_per_pcs' => 3.05,
                    'total_sqm' => 3.05,
                    'quantity' => 1,
                    'unit_price' => 392.24,
                ],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.project_name', 'BEATRICE UPDATED QUOTE');
        $response->assertJsonPath('data.lines.0.code', 'SD-1');
        $response->assertJsonPath('data.lines.0.unit_price', '392.24');
        $response->assertJsonPath('data.lines.0.line_total', '392.24');
        $response->assertJsonPath('data.status', 'draft');
        $this->assertDatabaseHas('quotations', [
            'account_id' => $account->id,
            'project_number' => '2026040613',
        ]);
    }
}
