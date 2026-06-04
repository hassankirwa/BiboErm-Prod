<?php

namespace Tests\Feature\QualityControl;

use App\Enums\ProjectStage;
use App\Enums\QualityControl\QcInspectionContext;
use App\Enums\QualityControl\QcInspectionResult;
use App\Enums\QualityControl\QcScheduleFrequency;
use App\Events\QualityControl\QcInspectionCompleted;
use App\Events\QualityControl\QcInspectionFailed;
use App\Models\Procurement\GoodsReceipt;
use App\Models\Procurement\PurchaseOrder;
use App\Models\Procurement\Supplier;
use App\Models\Project;
use App\Models\QualityControl\QcChecklistTemplate;
use App\Models\QualityControl\QcInspection;
use App\Models\QualityControl\QcInspectionSchedule;
use App\Models\User;
use App\Services\QualityControl\QcScheduleService;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\QcDefaultChecklistsSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class QcInspectionFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $inspector;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);

        $this->inspector = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->inspector->givePermissionTo([
            'qc.view',
            'qc.inspect',
            'qc.manage',
        ]);
    }

    public function test_seeder_creates_system_templates_for_all_contexts(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $contextCount = QcChecklistTemplate::query()
            ->where('is_system', true)
            ->whereNull('project_id')
            ->distinct('context')
            ->count('context');

        $this->assertGreaterThanOrEqual(9, $contextCount);
    }

    public function test_clone_template_to_project_override(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $project = $this->createProject();
        $template = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::SiteInstallation)
            ->where('is_system', true)
            ->firstOrFail();

        $response = $this->postJson("/api/v1/qc/templates/{$template->id}/clone", [
            'project_id' => $project->id,
        ]);

        $response->assertCreated();
        $cloneId = $response->json('data.id');

        $clone = QcChecklistTemplate::query()->findOrFail($cloneId);
        $this->assertSame($project->id, $clone->project_id);
        $this->assertSame($template->items, $clone->items);
        $this->assertFalse($clone->is_system);
    }

    public function test_start_inspection_uses_project_override_template(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $project = $this->createProject();
        $systemTemplate = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionQcPostFabrication)
            ->where('is_system', true)
            ->firstOrFail();

        $override = QcChecklistTemplate::query()->create([
            'name' => 'Project override',
            'context' => QcInspectionContext::ProductionQcPostFabrication,
            'stage' => QcInspectionContext::ProductionQcPostFabrication->value,
            'items' => [['key' => 'custom', 'label' => 'Custom', 'type' => 'pass_fail', 'required' => true, 'sort_order' => 1]],
            'is_active' => true,
            'is_system' => false,
            'project_id' => $project->id,
            'version' => 2,
        ]);

        $response = $this->postJson('/api/v1/qc/inspections', [
            'context' => QcInspectionContext::ProductionQcPostFabrication->value,
            'project_id' => $project->id,
        ]);

        $response->assertCreated();
        $this->assertSame($override->id, $response->json('data.template_id'));
        $this->assertNotSame($systemTemplate->id, $response->json('data.template_id'));
    }

    public function test_submit_without_result_returns_validation_error(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = $this->createPendingInspection(QcInspectionContext::ProductionQcPreCheck);

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('result');
    }

    public function test_submit_empty_checklist_with_explicit_pass(): void
    {
        Event::fake([QcInspectionCompleted::class]);

        Sanctum::actingAs($this->inspector);

        $inspection = QcInspection::query()->create([
            'reference' => 'QC-EMPTY-'.uniqid(),
            'context' => QcInspectionContext::ProductionQcPreCheck,
            'stage' => QcInspectionContext::ProductionQcPreCheck->value,
            'template_id' => null,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
            'notes' => 'Materials verified manually.',
        ]);

        $response = $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'notes' => 'Materials verified manually.',
        ]);

        $response->assertOk();
        $this->assertSame(QcInspectionResult::Pass->value, $response->json('data.result'));
        Event::assertDispatched(QcInspectionCompleted::class);
    }

    public function test_submit_assigns_default_template_when_missing(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = QcInspection::query()->create([
            'reference' => 'QC-NO-TPL-'.uniqid(),
            'context' => QcInspectionContext::ProductionQcPreCheck,
            'stage' => QcInspectionContext::ProductionQcPreCheck->value,
            'template_id' => null,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);

        $template = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionQcPreCheck)
            ->where('is_system', true)
            ->firstOrFail();

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'checklist_responses' => [
                'bom_match' => ['value' => 'pass'],
                'profile_length' => ['value' => 'pass'],
                'accessory_kit' => ['value' => 'pass'],
                'glass_not_required_yet' => ['value' => 'pass'],
            ],
        ])->assertOk();

        $inspection->refresh();
        $this->assertSame($template->id, $inspection->template_id);
    }

    public function test_submit_pass_dispatches_completed_event(): void
    {
        Event::fake([QcInspectionCompleted::class]);

        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = $this->createPendingInspection(QcInspectionContext::SiteInstallation);

        $responses = [];
        foreach ($inspection->template->items as $item) {
            $responses[$item['key']] = ['value' => 'pass'];
        }

        $response = $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'checklist_responses' => $responses,
        ]);

        $response->assertOk();
        Event::assertDispatched(QcInspectionCompleted::class, fn (QcInspectionCompleted $event) => $event->inspectionId === $inspection->id);
    }

    public function test_critical_defect_dispatches_failed_event(): void
    {
        Event::fake([QcInspectionFailed::class]);

        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = $this->createPendingInspection(QcInspectionContext::SiteInstallation);

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/defects", [
            'severity' => 'critical',
            'description' => 'Critical frame defect',
        ])->assertCreated();

        $responses = [];
        foreach ($inspection->template->items as $item) {
            $responses[$item['key']] = ['value' => 'pass'];
        }

        $response = $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'checklist_responses' => $responses,
        ]);

        $response->assertStatus(422);
        Event::assertNotDispatched(QcInspectionFailed::class);

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Fail->value,
            'checklist_responses' => $responses,
        ])->assertOk();

        Event::assertDispatched(QcInspectionFailed::class);
    }

    public function test_photo_required_on_fail_returns_validation_error(): void
    {
        Storage::fake('bibo');
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = QcInspection::query()->create([
            'reference' => 'QC-TEST-0001',
            'context' => QcInspectionContext::SnaggingSignoff,
            'stage' => QcInspectionContext::SnaggingSignoff->value,
            'template_id' => QcChecklistTemplate::query()
                ->where('context', QcInspectionContext::SnaggingSignoff)
                ->where('is_system', true)
                ->value('id'),
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);

        $response = $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'checklist_responses' => [
                'all_snags_closed' => ['value' => 'pass'],
                'rework_photographed' => ['value' => 'fail'],
                'client_signoff' => ['value' => 'pass'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('photos');
    }

    public function test_dashboard_summary_returns_data_wrapper(): void
    {
        Sanctum::actingAs($this->inspector);

        $response = $this->getJson('/api/v1/qc/dashboard/summary');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'open_defects_count',
                'due_schedules_count',
                'pending_inspections_count',
                'fail_rate_30d',
                'open_defects',
                'due_schedules',
                'fail_rate_trend',
            ],
        ]);
    }

    public function test_list_defects_with_filters(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $project = $this->createProject();
        $inspection = $this->createPendingInspection(QcInspectionContext::SiteInstallation, $project);

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/defects", [
            'severity' => 'major',
            'description' => 'Test defect for list',
        ])->assertCreated();

        $response = $this->getJson('/api/v1/qc/defects?project_id='.$project->id.'&severity=major');

        $response->assertOk();
        $response->assertJsonPath('data.0.description', 'Test defect for list');
    }

    public function test_grn_verifying_auto_creates_receiving_inspection(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $supplier = Supplier::query()->create([
            'code' => 'SUP-AUTO',
            'name' => 'Auto Supplier',
        ]);

        $order = PurchaseOrder::query()->create([
            'reference' => 'PO-AUTO-0001',
            'supplier_id' => $supplier->id,
            'status' => 'sent',
            'created_by' => $this->inspector->id,
        ]);

        $grn = GoodsReceipt::query()->create([
            'grn_number' => 'GRN-AUTO-0001',
            'purchase_order_id' => $order->id,
            'status' => 'verifying',
            'received_at' => now(),
            'created_by' => $this->inspector->id,
        ]);

        app(\App\Services\QualityControl\QcInspectionService::class)
            ->ensureReceivingInspection($grn->id, null);

        $this->assertDatabaseHas('qc_inspections', [
            'goods_receipt_id' => $grn->id,
            'context' => QcInspectionContext::WarehouseReceiving->value,
            'result' => QcInspectionResult::Pending->value,
        ]);
    }

    public function test_grn_linked_receiving_inspection(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $supplier = Supplier::query()->create([
            'code' => 'SUP-TEST',
            'name' => 'Test Supplier',
        ]);

        $order = PurchaseOrder::query()->create([
            'reference' => 'PO-TEST-0001',
            'supplier_id' => $supplier->id,
            'status' => 'sent',
            'created_by' => $this->inspector->id,
        ]);

        $grn = GoodsReceipt::query()->create([
            'grn_number' => 'GRN-TEST-0001',
            'purchase_order_id' => $order->id,
            'project_id' => null,
            'status' => 'verifying',
            'received_at' => now(),
            'created_by' => $this->inspector->id,
        ]);

        $response = $this->postJson('/api/v1/qc/inspections', [
            'context' => QcInspectionContext::WarehouseReceiving->value,
            'goods_receipt_id' => $grn->id,
        ]);

        $response->assertCreated();
        $this->assertSame($grn->id, $response->json('data.goods_receipt_id'));
    }

    public function test_schedule_run_recalculates_next_due_at(): void
    {
        $service = app(QcScheduleService::class);

        $schedule = QcInspectionSchedule::query()->create([
            'name' => 'Test weekly audit',
            'context' => QcInspectionContext::WarehouseAccessoriesAudit,
            'frequency' => QcScheduleFrequency::Weekly,
            'frequency_interval' => 1,
            'next_due_at' => now()->subDay(),
            'is_active' => true,
            'created_by' => $this->inspector->id,
        ]);

        $before = $schedule->next_due_at->copy();
        $updated = $service->markRunComplete($schedule);

        $this->assertTrue($updated->next_due_at->greaterThan($before));
        $this->assertSame(
            $service->calculateNextDueAt(QcScheduleFrequency::Weekly, 1, now())->toDateString(),
            $updated->next_due_at->toDateString(),
        );
    }

    public function test_qc_does_not_update_project_stage(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $project = $this->createProject(['stage' => ProjectStage::SiteQc]);
        $originalStage = $project->stage;

        $inspection = $this->createPendingInspection(QcInspectionContext::SiteInstallation, $project);

        $responses = [];
        foreach ($inspection->template->items as $item) {
            $responses[$item['key']] = ['value' => 'pass'];
        }

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'checklist_responses' => $responses,
        ])->assertOk();

        $project->refresh();
        $this->assertSame($originalStage, $project->stage);
    }

    protected function createProject(array $overrides = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PRJ-'.uniqid(),
            'name' => 'Test Project',
            'type' => 'full_install',
            'location_type' => 'nairobi',
            'stage' => ProjectStage::FabricationStage,
        ], $overrides));
    }

    protected function createPendingInspection(QcInspectionContext $context, ?Project $project = null): QcInspection
    {
        $template = QcChecklistTemplate::query()
            ->where('context', $context)
            ->where('is_system', true)
            ->firstOrFail();

        return QcInspection::query()->create([
            'reference' => 'QC-'.uniqid(),
            'project_id' => $project?->id,
            'context' => $context,
            'stage' => $context->value,
            'template_id' => $template->id,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
        ])->load('template');
    }
}
