<?php

namespace Tests\Feature\Workspace;

use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\User;
use Tests\Feature\FeatureTestCase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;

class WorkspaceHubBadgesTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
        $this->seedWarehouse();
    }

    public function test_hub_badges_returns_live_counts_for_permitted_apps(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'super_admin');

        $item = $this->itemBySku('ACC-HNG-001');
        $item->min_stock_qty = 99999;
        $item->save();

        PurchaseRequisition::query()->create([
            'reference' => 'PR-HUB-001',
            'status' => RequisitionStatus::PendingApproval,
            'requested_by' => $admin->id,
        ]);

        $project = Project::query()->create([
            'reference' => 'PRJ-HUB-001',
            'name' => 'Hub Badge Project',
            'stage' => 'materials_ready',
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ]);

        ProductionOrder::query()->create([
            'reference' => 'PO-HUB-001',
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::Scheduled,
            'current_stage' => ProductionStage::Cutting,
            'fifo_position' => 1,
            'scheduled_start' => now()->toDateString(),
            'scheduled_end' => now()->toDateString(),
        ]);

        Invoice::query()->create([
            'reference' => 'INV-HUB-001',
            'type' => 'milestone',
            'status' => Invoice::STATUS_OVERDUE,
            'amount' => 10000,
            'amount_paid' => 0,
            'due_date' => now()->subDays(5)->toDateString(),
            'issued_at' => now()->subDays(20)->toDateString(),
        ]);

        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        LeaveRequest::query()->create([
            'user_id' => $employee->id,
            'leave_type' => LeaveRequest::TYPE_ANNUAL,
            'start_date' => now()->subDay()->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'status' => LeaveRequest::STATUS_APPROVED,
        ]);

        $this->actingAsSanctum($admin);

        $response = $this->getJson('/api/v1/workspace/hub-badges')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'warehouse' => ['count', 'label', 'className'],
                    'procurement' => ['count', 'label', 'className'],
                    'dispatch' => ['count', 'label', 'className'],
                    'finance' => ['count', 'label', 'className'],
                    'hr' => ['count', 'label', 'className'],
                ],
            ]);

        $this->assertGreaterThanOrEqual(1, $response->json('data.warehouse.count'));
        $this->assertSame(1, $response->json('data.procurement.count'));
        $this->assertSame(1, $response->json('data.dispatch.count'));
        $this->assertSame(1, $response->json('data.finance.count'));
        $this->assertSame(1, $response->json('data.hr.count'));
        $this->assertStringContainsString('Low Stock', $response->json('data.warehouse.label'));
    }

    public function test_hub_badges_omits_counts_without_permission(): void
    {
        $user = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        Invoice::query()->create([
            'reference' => 'INV-HUB-002',
            'type' => 'milestone',
            'status' => Invoice::STATUS_OVERDUE,
            'amount' => 5000,
            'amount_paid' => 0,
            'due_date' => now()->subDays(2)->toDateString(),
        ]);

        $this->actingAsSanctum($user);

        $response = $this->getJson('/api/v1/workspace/hub-badges')->assertOk();

        $this->assertSame([], $response->json('data'));
    }
}
