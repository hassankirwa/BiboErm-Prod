<?php

namespace Tests\Feature\Procurement;

use App\Enums\Procurement\GlassOrderStatus;
use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Procurement\RequisitionTrigger;
use App\Models\Procurement\GlassOrder;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class GlassOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ([
            'procurement.glass.view',
            'procurement.glass.manage',
            'procurement.view',
            'procurement.manage',
        ] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->manager = User::factory()->create();
        $this->manager->givePermissionTo([
            'procurement.glass.view',
            'procurement.glass.manage',
            'procurement.view',
            'procurement.manage',
        ]);
    }

    protected function createProject(array $overrides = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PRJ-'.uniqid(),
            'name' => 'Test Project',
            'type' => 'residential',
            'location_type' => 'nairobi',
            'stage' => 'materials_ready',
        ], $overrides));
    }

    public function test_mark_ordered_rejects_incomplete_draft(): void
    {
        $project = $this->createProject();

        $order = GlassOrder::query()->create([
            'order_number' => 'GLS-TEST-001',
            'project_id' => $project->id,
            'specs' => ['source' => 'test', 'requirements' => '', 'panes' => []],
            'status' => GlassOrderStatus::Draft,
            'created_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/procurement/glass-orders/{$order->id}/mark-ordered")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['supplier_id', 'specs.requirements', 'specs.panes']);
    }

    public function test_mark_ordered_succeeds_when_required_fields_present(): void
    {
        $project = $this->createProject();
        $supplier = \App\Models\Procurement\Supplier::query()->create([
            'code' => 'GLASS-01',
            'name' => 'Test Glass Co',
            'category' => 'glass',
            'is_active' => true,
        ]);

        $order = GlassOrder::query()->create([
            'order_number' => 'GLS-TEST-002',
            'project_id' => $project->id,
            'supplier_id' => $supplier->id,
            'specs' => [
                'requirements' => '6mm tempered clear',
                'panes' => [
                    [
                        'name' => 'Window 1',
                        'width_mm' => 1200,
                        'height_mm' => 800,
                        'quantity' => 2,
                    ],
                ],
            ],
            'status' => GlassOrderStatus::Draft,
            'created_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/procurement/glass-orders/{$order->id}/mark-ordered")
            ->assertOk()
            ->assertJsonPath('data.status', 'ordered')
            ->assertJsonPath('data.purchase_requisition_id', fn ($value) => is_int($value) && $value > 0);

        $order->refresh();

        $this->assertSame(GlassOrderStatus::Ordered, $order->status);
        $this->assertNotNull($order->purchase_requisition_id);

        $requisition = PurchaseRequisition::query()->findOrFail($order->purchase_requisition_id);
        $this->assertSame(RequisitionStatus::PendingApproval, $requisition->status);
        $this->assertSame($project->id, $requisition->project_id);
        $this->assertSame($supplier->id, $requisition->supplier_id);
        $this->assertCount(1, $requisition->lines);
        $this->assertSame(RequisitionTrigger::GlassOrder, $requisition->lines->first()->trigger_type);
        $this->assertSame('2.000', $requisition->lines->first()->quantity);
    }

    public function test_glass_order_index_includes_project(): void
    {
        $project = $this->createProject([
            'reference' => 'PRJ-GLASS-001',
            'name' => 'Glass Tower',
        ]);

        GlassOrder::query()->create([
            'order_number' => 'GLS-TEST-003',
            'project_id' => $project->id,
            'specs' => ['requirements' => '', 'panes' => []],
            'status' => GlassOrderStatus::Draft,
            'created_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->getJson("/api/v1/procurement/glass-orders?project_id={$project->id}")
            ->assertOk()
            ->assertJsonPath('data.0.project_id', $project->id)
            ->assertJsonPath('data.0.project.reference', 'PRJ-GLASS-001');
    }
}
