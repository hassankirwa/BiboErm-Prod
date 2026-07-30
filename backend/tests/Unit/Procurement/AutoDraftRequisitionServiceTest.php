<?php

namespace Tests\Unit\Procurement;

use App\Enums\Procurement\RequisitionStatus;
use App\Enums\Procurement\RequisitionTrigger;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Models\Project;
use App\Models\User;
use App\Models\Warehouse\Item;
use App\Services\Procurement\Requisitions\AutoDraftRequisitionService;
use App\Services\Procurement\Requisitions\PurchaseRequisitionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AutoDraftRequisitionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_shortage_creates_draft(): void
    {
        $this->makeUser();
        $project = $this->makeProject();
        $item = $this->makeWarehouseItem(['name' => 'Profile A', 'sku' => 'PRF-A']);

        $requisition = app(AutoDraftRequisitionService::class)->fromShortage(
            new ProjectMaterialShortageDetected(
                projectId: $project->id,
                reservationId: null,
                shortageLines: [[
                    'warehouse_item_id' => $item->id,
                    'qty_required' => 8,
                    'qty_available' => 2,
                    'qty_short' => 6,
                ]],
            ),
        );

        $this->assertSame(RequisitionStatus::Draft, $requisition->status);
        $this->assertSame($project->id, $requisition->project_id);
        $this->assertSame('Auto-drafted from material shortage', $requisition->notes);
        $this->assertCount(1, $requisition->lines);
        $this->assertSame(RequisitionTrigger::BomShortage, $requisition->lines->first()->trigger_type);
        $this->assertSame('6.000', $requisition->lines->first()->quantity);
        $this->assertDatabaseCount('purchase_requisitions', 1);
    }

    public function test_second_shortage_same_project_reuses_and_updates_draft(): void
    {
        $this->makeUser();
        $project = $this->makeProject();
        $itemA = $this->makeWarehouseItem(['name' => 'Profile A', 'sku' => 'PRF-A']);
        $itemB = $this->makeWarehouseItem(['name' => 'Profile B', 'sku' => 'PRF-B']);

        $service = app(AutoDraftRequisitionService::class);

        $first = $service->fromShortage(new ProjectMaterialShortageDetected(
            projectId: $project->id,
            reservationId: null,
            shortageLines: [[
                'warehouse_item_id' => $itemA->id,
                'qty_required' => 8,
                'qty_available' => 2,
                'qty_short' => 6,
            ]],
        ));

        $second = $service->fromShortage(new ProjectMaterialShortageDetected(
            projectId: $project->id,
            reservationId: null,
            shortageLines: [
                [
                    'warehouse_item_id' => $itemA->id,
                    'qty_required' => 10,
                    'qty_available' => 1,
                    'qty_short' => 9,
                ],
                [
                    'warehouse_item_id' => $itemB->id,
                    'qty_required' => 4,
                    'qty_available' => 0,
                    'qty_short' => 4,
                ],
            ],
        ));

        $this->assertSame($first->id, $second->id);
        $this->assertSame(RequisitionStatus::Draft, $second->status);
        $this->assertCount(2, $second->lines);
        $this->assertSame('9.000', $second->lines->firstWhere('warehouse_item_id', $itemA->id)?->quantity);
        $this->assertSame('4.000', $second->lines->firstWhere('warehouse_item_id', $itemB->id)?->quantity);
        $this->assertDatabaseCount('purchase_requisitions', 1);
        $this->assertDatabaseCount('purchase_requisition_lines', 2);
    }

    public function test_second_shortage_returns_existing_non_draft_open_requisition(): void
    {
        $this->makeUser();
        $project = $this->makeProject();
        $item = $this->makeWarehouseItem();

        $service = app(AutoDraftRequisitionService::class);

        $first = $service->fromShortage(new ProjectMaterialShortageDetected(
            projectId: $project->id,
            reservationId: null,
            shortageLines: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => 5,
                'qty_available' => 0,
                'qty_short' => 5,
            ]],
        ));

        $first->update(['status' => RequisitionStatus::PendingApproval]);

        $second = $service->fromShortage(new ProjectMaterialShortageDetected(
            projectId: $project->id,
            reservationId: null,
            shortageLines: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => 9,
                'qty_available' => 0,
                'qty_short' => 9,
            ]],
        ));

        $this->assertSame($first->id, $second->id);
        $this->assertSame(RequisitionStatus::PendingApproval, $second->status);
        $this->assertCount(1, $second->lines);
        $this->assertSame('5.000', $second->lines->first()->quantity);
        $this->assertDatabaseCount('purchase_requisitions', 1);
    }

    public function test_different_project_can_create_its_own_draft(): void
    {
        $this->makeUser();
        $projectA = $this->makeProject(['reference' => 'PRJ-A']);
        $projectB = $this->makeProject(['reference' => 'PRJ-B']);
        $item = $this->makeWarehouseItem();

        $service = app(AutoDraftRequisitionService::class);

        $reqA = $service->fromShortage(new ProjectMaterialShortageDetected(
            projectId: $projectA->id,
            reservationId: null,
            shortageLines: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => 3,
                'qty_available' => 0,
                'qty_short' => 3,
            ]],
        ));

        $reqB = $service->fromShortage(new ProjectMaterialShortageDetected(
            projectId: $projectB->id,
            reservationId: null,
            shortageLines: [[
                'warehouse_item_id' => $item->id,
                'qty_required' => 4,
                'qty_available' => 0,
                'qty_short' => 4,
            ]],
        ));

        $this->assertNotSame($reqA->id, $reqB->id);
        $this->assertSame($projectA->id, $reqA->project_id);
        $this->assertSame($projectB->id, $reqB->project_id);
        $this->assertDatabaseCount('purchase_requisitions', 2);
    }

    public function test_create_draft_rejects_duplicate_open_bom_shortage_for_project(): void
    {
        $user = $this->makeUser();
        $project = $this->makeProject();
        $item = $this->makeWarehouseItem();

        $requisitions = app(PurchaseRequisitionService::class);

        $requisitions->createDraft($user, [
            'project_id' => $project->id,
            'notes' => 'First',
            'lines' => [[
                'warehouse_item_id' => $item->id,
                'description' => $item->name,
                'quantity' => 2,
                'trigger_type' => RequisitionTrigger::BomShortage->value,
            ]],
        ], RequisitionTrigger::BomShortage);

        try {
            $requisitions->createDraft($user, [
                'project_id' => $project->id,
                'notes' => 'Duplicate',
                'lines' => [[
                    'warehouse_item_id' => $item->id,
                    'description' => $item->name,
                    'quantity' => 3,
                    'trigger_type' => RequisitionTrigger::BomShortage->value,
                ]],
            ], RequisitionTrigger::BomShortage);
            $this->fail('Duplicate BOM shortage draft should be rejected.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('project_id', $e->errors());
        }

        $this->assertDatabaseCount('purchase_requisitions', 1);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeUser(array $attributes = []): User
    {
        return User::query()->create(array_merge([
            'name' => 'User '.Str::random(5),
            'email' => Str::lower(Str::random(8)).'@example.com',
            'password' => bcrypt('password123'),
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PRJ-'.Str::upper(Str::random(6)),
            'name' => 'Procurement Project',
            'stage' => 'awaiting_procurement',
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeWarehouseItem(array $attributes = []): Item
    {
        return Item::query()->create(array_merge([
            'sku' => 'SKU-'.Str::upper(Str::random(6)),
            'name' => 'Warehouse Item',
            'category' => 'accessory',
            'unit_of_measure' => 'pcs',
            'min_stock_qty' => 5,
            'is_active' => true,
        ], $attributes));
    }
}
