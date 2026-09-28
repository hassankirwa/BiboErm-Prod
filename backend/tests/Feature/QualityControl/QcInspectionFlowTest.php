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

        $this->assertGreaterThanOrEqual(10, $contextCount);
    }

    public function test_grn_receiving_template_has_practical_checklist_items(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $template = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::WarehouseReceiving)
            ->where('is_system', true)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->firstOrFail();

        $this->assertSame('GRN Receiving', $template->name);

        $keys = collect($template->items)->pluck('key')->all();
        $this->assertContains('docs_delivery_packing_list', $keys);
        $this->assertContains('qty_matches_po_grn', $keys);
        $this->assertContains('sku_profile_identity', $keys);
        $this->assertContains('dimensions_length_profile', $keys);
        $this->assertContains('finish_color_coating_tier', $keys);
        $this->assertContains('visible_damage', $keys);
        $this->assertContains('packing_condition', $keys);
        $this->assertContains('accessories_completeness', $keys);
        $this->assertContains('putaway_ready_labelling', $keys);
        $this->assertGreaterThanOrEqual(8, count($template->items));
    }

    public function test_production_stage_templates_are_seeded(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $pre = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionQcPreCheck)
            ->where('is_system', true)
            ->where('is_active', true)
            ->firstOrFail();
        $this->assertGreaterThanOrEqual(8, count($pre->items));
        $this->assertContains('cutting_sheet_ready', collect($pre->items)->pluck('key'));

        $cutting = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionInProcess)
            ->where('stage', 'cutting')
            ->where('is_system', true)
            ->where('is_active', true)
            ->firstOrFail();
        $this->assertSame('Cutting QC', $cutting->name);
        $this->assertContains('cut_length_tolerance', collect($cutting->items)->pluck('key'));

        foreach (['fabrication', 'sash', 'glass_assembly', 'finishing'] as $stage) {
            $this->assertTrue(
                QcChecklistTemplate::query()
                    ->where('context', QcInspectionContext::ProductionInProcess)
                    ->where('stage', $stage)
                    ->where('is_active', true)
                    ->exists(),
                "Missing in-process template for {$stage}",
            );
        }

        $post = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionQcPostFabrication)
            ->where('is_system', true)
            ->where('is_active', true)
            ->firstOrFail();
        $this->assertGreaterThanOrEqual(8, count($post->items));
    }

    public function test_in_process_inspection_resolves_stage_specific_template(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $project = Project::query()->create([
            'reference' => 'PRJ-QC-CUT-'.uniqid(),
            'name' => 'Cutting QC Project',
            'stage' => 'cutting_stage',
            'type' => 'residential',
            'location_type' => 'nairobi',
        ]);

        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-QC-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'cutting',
            'fifo_position' => 1,
        ]);

        $response = $this->postJson('/api/v1/qc/inspections', [
            'context' => QcInspectionContext::ProductionInProcess->value,
            'stage' => 'cutting',
            'project_id' => $project->id,
            'production_order_id' => $order->id,
        ]);

        $response->assertCreated();
        $this->assertSame('cutting', $response->json('data.stage'));
        $this->assertSame('Cutting QC', $response->json('data.template.name'));
        $this->assertNotEmpty($response->json('data.template.items'));
    }

    public function test_seeder_backfills_pending_receiving_inspection_without_template(): void
    {
        $supplier = Supplier::query()->create([
            'code' => 'SUP-BF',
            'name' => 'Backfill Supplier',
        ]);

        $order = PurchaseOrder::query()->create([
            'reference' => 'PO-BF-0001',
            'supplier_id' => $supplier->id,
            'status' => 'sent',
            'created_by' => $this->inspector->id,
        ]);

        $grn = GoodsReceipt::query()->create([
            'grn_number' => 'GRN-BF-0001',
            'purchase_order_id' => $order->id,
            'status' => 'verifying',
            'received_at' => now(),
            'created_by' => $this->inspector->id,
        ]);

        $inspection = QcInspection::query()->create([
            'reference' => 'QC-2026-0001',
            'goods_receipt_id' => $grn->id,
            'context' => QcInspectionContext::WarehouseReceiving,
            'stage' => QcInspectionContext::WarehouseReceiving->value,
            'template_id' => null,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);

        $this->seed(QcDefaultChecklistsSeeder::class);

        $inspection->refresh();
        $this->assertNotNull($inspection->template_id);

        $template = QcChecklistTemplate::query()->findOrFail($inspection->template_id);
        $this->assertSame(QcInspectionContext::WarehouseReceiving, $template->context);
        $this->assertNotEmpty($template->items);
    }

    public function test_show_inspection_auto_assigns_default_template(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $template = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::WarehouseReceiving)
            ->where('is_system', true)
            ->where('is_active', true)
            ->firstOrFail();

        $supplier = Supplier::query()->create([
            'code' => 'SUP-SHOW',
            'name' => 'Show Supplier',
        ]);

        $order = PurchaseOrder::query()->create([
            'reference' => 'PO-SHOW-0001',
            'supplier_id' => $supplier->id,
            'status' => 'sent',
            'created_by' => $this->inspector->id,
        ]);

        $grn = GoodsReceipt::query()->create([
            'grn_number' => 'GRN-SHOW-0001',
            'purchase_order_id' => $order->id,
            'status' => 'verifying',
            'received_at' => now(),
            'created_by' => $this->inspector->id,
        ]);

        $inspection = QcInspection::query()->create([
            'reference' => 'QC-SHOW-0001',
            'goods_receipt_id' => $grn->id,
            'context' => QcInspectionContext::WarehouseReceiving,
            'stage' => QcInspectionContext::WarehouseReceiving->value,
            'template_id' => null,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);

        $response = $this->getJson("/api/v1/qc/inspections/{$inspection->id}");

        $response->assertOk();
        $this->assertSame($template->id, $response->json('data.template_id'));
        $this->assertNotEmpty($response->json('data.template.items'));
        $this->assertSame('GRN Receiving', $response->json('data.template.name'));
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
            'checklist_responses' => collect($template->items)->mapWithKeys(
                fn (array $item) => [$item['key'] => ['value' => 'pass']],
            )->all(),
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

        $inspection = QcInspection::query()
            ->where('goods_receipt_id', $grn->id)
            ->where('context', QcInspectionContext::WarehouseReceiving)
            ->firstOrFail();

        $this->assertNotNull($inspection->template_id);
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
        $this->assertNotNull($response->json('data.template_id'));
        $this->assertSame('GRN Receiving', $response->json('data.template.name'));
        $this->assertNotEmpty($response->json('data.template.items'));
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

    public function test_pre_cutting_inspection_can_be_skipped(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = $this->createPendingInspection(QcInspectionContext::ProductionQcPreCheck);

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/skip", [
            'notes' => 'Will inspect after assembly',
        ])
            ->assertOk()
            ->assertJsonPath('data.result', QcInspectionResult::Skipped->value)
            ->assertJsonPath('data.notes', 'Will inspect after assembly');

        $inspection->refresh();
        $this->assertSame(QcInspectionResult::Skipped, $inspection->result);
    }

    public function test_post_fab_qc_pass_marks_production_order_completed(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $project = $this->createProject(['stage' => ProjectStage::GlassAssembly]);
        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-COMPLETE-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'qc_post_fabrication',
            'fifo_position' => 1,
        ]);

        $template = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionQcPostFabrication)
            ->where('is_system', true)
            ->firstOrFail();

        $inspection = QcInspection::query()->create([
            'reference' => 'QC-POST-'.uniqid(),
            'project_id' => $project->id,
            'production_order_id' => $order->id,
            'context' => QcInspectionContext::ProductionQcPostFabrication,
            'stage' => QcInspectionContext::ProductionQcPostFabrication->value,
            'template_id' => $template->id,
            'result' => QcInspectionResult::Pending,
            'inspector_id' => $this->inspector->id,
            'checklist_responses' => [],
            'custom_items' => [],
        ])->load('template');

        $responses = [];
        foreach ($inspection->template->items as $item) {
            $responses[$item['key']] = ['value' => 'pass'];
        }

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/submit", [
            'result' => QcInspectionResult::Pass->value,
            'notes' => 'Factory QC passed.',
            'checklist_responses' => $responses,
        ])->assertOk();

        $this->assertSame(
            \App\Enums\Production\ProductionOrderStatus::Completed,
            $order->fresh()->status,
        );
        $this->assertNotNull($order->fresh()->actual_end);
        $this->assertSame(ProjectStage::QcPreInstallation, $project->fresh()->stage);
    }

    public function test_post_fabrication_inspection_cannot_be_skipped(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);
        Sanctum::actingAs($this->inspector);

        $inspection = $this->createPendingInspection(QcInspectionContext::ProductionQcPostFabrication);

        $this->postJson("/api/v1/qc/inspections/{$inspection->id}/skip")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['inspection']);
    }

    public function test_finishing_complete_creates_post_fabrication_inspection_without_inspector_user(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $project = $this->createProject();
        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-POST-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'qc_post_fabrication',
            'fifo_position' => 1,
        ]);

        $created = app(\App\Services\QualityControl\QcInspectionService::class)
            ->createFromProductionStage($project->id, $order->id, 'finishing');

        $this->assertCount(2, $created);
        $postFab = $created->first(
            fn ($i) => $i->context === QcInspectionContext::ProductionQcPostFabrication
        );
        $this->assertNotNull($postFab);
        $this->assertSame(QcInspectionResult::Pending, $postFab->result);
        $this->assertNotNull($postFab->template_id);
        $this->assertSame(
            'Post-fabrication QC',
            $postFab->template?->name
                ?? QcChecklistTemplate::query()->find($postFab->template_id)?->name
        );
    }

    public function test_create_from_production_stage_does_not_reopen_completed_inspection(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $project = $this->createProject();
        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-POST-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'qc_post_fabrication',
            'fifo_position' => 1,
        ]);

        $service = app(\App\Services\QualityControl\QcInspectionService::class);
        $firstBatch = $service->createFromProductionStage($project->id, $order->id, 'finishing');
        $postFab = $firstBatch->first(
            fn ($i) => $i->context === QcInspectionContext::ProductionQcPostFabrication
        );
        $this->assertNotNull($postFab);

        $postFab->update(['result' => QcInspectionResult::Pass]);

        $second = $service->createFromProductionStage($project->id, $order->id, 'qc_post_fabrication');
        $third = $service->createFromProductionStage($project->id, $order->id, 'finishing');

        $this->assertSame($postFab->id, $second->first()?->id);
        $this->assertTrue(
            $third->contains(fn ($i) => (int) $i->id === (int) $postFab->id)
        );
        $this->assertSame(
            1,
            QcInspection::query()
                ->where('production_order_id', $order->id)
                ->where('context', QcInspectionContext::ProductionQcPostFabrication)
                ->count(),
        );
    }

    public function test_create_from_production_stage_reuses_pending_before_completed(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $project = $this->createProject();
        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-POST-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'qc_post_fabrication',
            'fifo_position' => 1,
        ]);

        $template = QcChecklistTemplate::query()
            ->where('context', QcInspectionContext::ProductionQcPostFabrication)
            ->where('is_system', true)
            ->firstOrFail();

        $completed = QcInspection::query()->create([
            'reference' => 'QC-DONE-'.uniqid(),
            'project_id' => $project->id,
            'production_order_id' => $order->id,
            'context' => QcInspectionContext::ProductionQcPostFabrication,
            'stage' => QcInspectionContext::ProductionQcPostFabrication->value,
            'template_id' => $template->id,
            'result' => QcInspectionResult::Fail,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);

        $pending = QcInspection::query()->create([
            'reference' => 'QC-PEND-'.uniqid(),
            'project_id' => $project->id,
            'production_order_id' => $order->id,
            'context' => QcInspectionContext::ProductionQcPostFabrication,
            'stage' => QcInspectionContext::ProductionQcPostFabrication->value,
            'template_id' => $template->id,
            'result' => QcInspectionResult::Pending,
            'checklist_responses' => [],
            'custom_items' => [],
        ]);

        $found = app(\App\Services\QualityControl\QcInspectionService::class)
            ->createFromProductionStage($project->id, $order->id, 'qc_post_fabrication');

        $this->assertSame($pending->id, $found->first()?->id);
        $this->assertNotSame($completed->id, $found->first()?->id);
        $this->assertSame(
            2,
            QcInspection::query()
                ->where('production_order_id', $order->id)
                ->where('context', QcInspectionContext::ProductionQcPostFabrication)
                ->count(),
        );
    }

    public function test_cutting_complete_creates_per_opening_in_process_qc(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $project = $this->createProject();
        $this->attachDesignOpenings($project, ['SD-1', 'SD-2', 'SD-3', 'SD-4']);

        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-CUT-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'cutting',
            'fifo_position' => 1,
        ]);

        $created = app(\App\Services\QualityControl\QcInspectionService::class)
            ->createFromProductionStage($project->id, $order->id, 'cutting');

        $this->assertCount(4, $created);
        $codes = $created->pluck('opening_code')->sort()->values()->all();
        $this->assertSame(['SD-1', 'SD-2', 'SD-3', 'SD-4'], $codes);

        foreach ($created as $inspection) {
            $this->assertSame(QcInspectionContext::ProductionInProcess, $inspection->context);
            $this->assertSame('cutting', $inspection->stage);
            $this->assertSame(QcInspectionResult::Pending, $inspection->result);
            $this->assertSame(
                'Cutting QC',
                QcChecklistTemplate::query()->find($inspection->template_id)?->name
            );
        }

        // Soft: re-fire is idempotent
        $again = app(\App\Services\QualityControl\QcInspectionService::class)
            ->createFromProductionStage($project->id, $order->id, 'cutting');
        $this->assertCount(4, $again);
        $this->assertSame(
            4,
            QcInspection::query()
                ->where('production_order_id', $order->id)
                ->where('context', QcInspectionContext::ProductionInProcess)
                ->where('stage', 'cutting')
                ->count(),
        );
    }

    public function test_post_fab_hard_gate_requires_all_openings_passed(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $project = $this->createProject();
        $this->attachDesignOpenings($project, ['SD-1', 'SD-2']);

        $order = \App\Models\Production\ProductionOrder::query()->create([
            'reference' => 'PROD-GATE-'.uniqid(),
            'project_id' => $project->id,
            'status' => 'in_progress',
            'current_stage' => 'qc_post_fabrication',
            'fifo_position' => 1,
        ]);

        $service = app(\App\Services\QualityControl\QcInspectionService::class);
        $created = $service->createFromProductionStage($project->id, $order->id, 'qc_post_fabrication');
        $this->assertCount(2, $created);

        $this->assertFalse($service->hasPassedPostFabricationQc($project->id, $order->id));

        $created->first()->update(['result' => QcInspectionResult::Pass]);
        $this->assertFalse($service->hasPassedPostFabricationQc($project->id, $order->id));

        $created->last()->update(['result' => QcInspectionResult::Pass]);
        $this->assertTrue($service->hasPassedPostFabricationQc($project->id, $order->id));
    }

    public function test_site_receiving_and_installation_fan_out_per_opening(): void
    {
        $this->seed(QcDefaultChecklistsSeeder::class);

        $project = $this->createProject(['stage' => ProjectStage::Installation]);
        $this->attachDesignOpenings($project, ['SD-1', 'SD-4']);

        $job = \App\Models\FieldInstallation\FieldInstallationJob::query()->create([
            'reference' => 'FIJ-'.uniqid(),
            'project_id' => $project->id,
            'status' => \App\Enums\FieldInstallation\FieldJobStatus::InProgress,
            'job_type' => \App\Enums\FieldInstallation\FieldJobType::NairobiSiteInstall,
            'created_by' => $this->inspector->id,
        ]);

        $service = app(\App\Services\QualityControl\QcInspectionService::class);

        $receiving = $service->createSiteReceiving($project->id, $job->id, 99);
        $this->assertCount(2, $receiving);
        $this->assertSame(['SD-1', 'SD-4'], $receiving->pluck('opening_code')->sort()->values()->all());
        $this->assertTrue(
            str_contains((string) $receiving->first()->notes, 'field_delivery_record_id:99')
        );

        $install = $service->createSiteInstallation($project->id, $job->id);
        $this->assertCount(2, $install);
        $this->assertSame(
            QcInspectionContext::SiteInstallation,
            $install->first()->context
        );

        $pre = $service->createSitePreInstallation($project->id);
        $this->assertCount(2, $pre);
        $this->assertSame(
            QcInspectionContext::SitePreInstallation,
            $pre->first()->context
        );
        $this->assertSame(
            'Site pre-installation QC',
            QcChecklistTemplate::query()->find($pre->first()->template_id)?->name
        );
    }

    /**
     * @param  list<string>  $codes
     */
    protected function attachDesignOpenings(Project $project, array $codes): void
    {
        foreach ($codes as $code) {
            \App\Models\ProjectDocument::query()->create([
                'project_id' => $project->id,
                'type' => 'design',
                'filename' => "{$code}.pdf",
                'path' => "projects/{$project->id}/{$code}.pdf",
                'version' => 1,
                'metadata' => [
                    'code' => $code,
                    'source' => 'fabrication',
                ],
            ]);
        }
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
