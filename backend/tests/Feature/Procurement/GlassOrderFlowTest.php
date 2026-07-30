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

    public function test_mark_delivered_requires_buying_prices_and_records_price_per_sqm(): void
    {
        $project = $this->createProject();
        $supplier = \App\Models\Procurement\Supplier::query()->create([
            'code' => 'GLASS-02',
            'name' => 'Supplier 2 Glass Ltd',
            'category' => 'glass',
            'is_active' => true,
        ]);

        $order = GlassOrder::query()->create([
            'order_number' => 'GLS-TEST-004',
            'project_id' => $project->id,
            'supplier_id' => $supplier->id,
            'specs' => [
                'requirements' => '6mm tempered clear',
                'panes' => [
                    [
                        'name' => 'Window 1',
                        'width_mm' => 1000,
                        'height_mm' => 1000,
                        'quantity' => 2,
                        'glass_type' => 'Tempered',
                        'tint' => 'Clear',
                    ],
                ],
            ],
            'status' => GlassOrderStatus::Ordered,
            'ordered_at' => now(),
            'created_by' => $this->manager->id,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/procurement/glass-orders/{$order->id}/mark-delivered")
            ->assertStatus(422);

        $this->actingAs($this->manager, 'sanctum')
            ->postJson("/api/v1/procurement/glass-orders/{$order->id}/mark-delivered", [
                'panes' => [
                    ['unit_buying_price' => 5000],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonPath('data.total_cost', 10000)
            ->assertJsonPath('data.total_area_m2', 2)
            ->assertJsonPath('data.specs.panes.0.unit_buying_price', 5000)
            ->assertJsonPath('data.specs.panes.0.buying_price', 10000)
            ->assertJsonPath('data.specs.panes.0.price_per_sqm', 5000);

        $this->assertDatabaseHas('glass_price_records', [
            'glass_order_id' => $order->id,
            'glass_type' => 'Tempered',
            'quantity' => 2,
            'buying_price' => 10000,
            'price_per_sqm' => 5000,
            'area_m2' => 2,
        ]);

        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/v1/procurement/glass-price-analytics')
            ->assertOk()
            ->assertJsonPath('data.summary.records_count', 1)
            ->assertJsonPath('data.price_by_type.0.glass_type', 'Tempered');
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
