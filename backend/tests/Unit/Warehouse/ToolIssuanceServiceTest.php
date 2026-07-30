<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolIncidentStatus;
use App\Enums\Warehouse\ToolIncidentType;
use App\Enums\Warehouse\ToolTrackingMode;
use App\Events\Warehouse\ToolReplacementRequired;
use App\Models\User;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\ToolIncident;
use App\Services\Warehouse\Tools\ToolIncidentService;
use App\Services\Warehouse\Tools\ToolIssuanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use InvalidArgumentException;
use Tests\Support\InteractsWithSeededApplication;
use Tests\Support\InteractsWithWarehouseData;
use Tests\TestCase;

class ToolIssuanceServiceTest extends TestCase
{
    use InteractsWithSeededApplication;
    use InteractsWithWarehouseData;
    use RefreshDatabase;

    private ToolIssuanceService $service;

    private User $issuer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedApplication();
        $this->seedWarehouse();

        $this->service = app(ToolIssuanceService::class);
        $this->issuer = $this->warehouseAluminiumManager();
    }

    public function test_damaged_return_emits_replacement_event(): void
    {
        Event::fake([ToolReplacementRequired::class]);

        $tool = $this->toolByCode('TL-DRLL-001');
        $issuedTo = $this->productionManager();

        $issuance = $this->service->issue(
            tool: $tool,
            issuedTo: $issuedTo,
            issuedBy: $this->issuer,
        );

        $this->service->returnTool(
            issuance: $issuance,
            conditionIn: ToolCondition::Damaged->value,
            damageNotes: 'Chuck broken',
        );

        Event::assertDispatched(ToolReplacementRequired::class, fn (ToolReplacementRequired $event) => $event->toolId === $tool->id);
    }

    public function test_quantity_issue_and_return_updates_available_qty(): void
    {
        $tool = Tool::query()->create([
            'tool_code' => 'TL-QTY-001',
            'name' => 'Safety Helmets',
            'tool_type' => 'PPE',
            'condition' => ToolCondition::Good,
            'is_active' => true,
            'tracking_mode' => ToolTrackingMode::Quantity,
            'total_qty' => 10,
            'qty_in_repair' => 0,
        ]);

        $issuedTo = $this->productionManager();

        $this->assertSame(10, $tool->availableQty());
        $this->assertSame(0, $tool->issuedQty());

        $issuance = $this->service->issue(
            tool: $tool,
            issuedTo: $issuedTo,
            issuedBy: $this->issuer,
            quantity: 4,
        );

        $tool->refresh();
        $this->assertSame(4, (int) $issuance->quantity);
        $this->assertSame(4, $tool->issuedQty());
        $this->assertSame(6, $tool->availableQty());

        $this->service->returnTool($issuance, conditionIn: ToolCondition::Good->value);

        $tool->refresh();
        $this->assertSame(0, $tool->issuedQty());
        $this->assertSame(10, $tool->availableQty());
    }

    public function test_quantity_issue_rejects_over_available(): void
    {
        $tool = Tool::query()->create([
            'tool_code' => 'TL-QTY-002',
            'name' => 'Harnesses',
            'tool_type' => 'PPE',
            'condition' => ToolCondition::Good,
            'is_active' => true,
            'tracking_mode' => ToolTrackingMode::Quantity,
            'total_qty' => 3,
            'qty_in_repair' => 0,
        ]);

        $this->expectException(InvalidArgumentException::class);

        $this->service->issue(
            tool: $tool,
            issuedTo: $this->productionManager(),
            issuedBy: $this->issuer,
            quantity: 5,
        );
    }

    public function test_serialized_forces_quantity_one_and_blocks_second_issue(): void
    {
        $tool = $this->toolByCode('TL-CUT-001');
        $issuedTo = $this->productionManager();

        $issuance = $this->service->issue(
            tool: $tool,
            issuedTo: $issuedTo,
            issuedBy: $this->issuer,
            quantity: 5,
        );

        $this->assertSame(1, (int) $issuance->quantity);
        $this->assertSame(0, $tool->fresh()->availableQty());

        $this->expectException(InvalidArgumentException::class);

        $this->service->issue(
            tool: $tool->fresh(),
            issuedTo: $issuedTo,
            issuedBy: $this->issuer,
        );
    }

    public function test_damaged_return_creates_tool_incident(): void
    {
        $tool = Tool::query()->create([
            'tool_code' => 'TL-QTY-DMG',
            'name' => 'Spirit Levels',
            'tool_type' => 'Measuring',
            'condition' => ToolCondition::Good,
            'is_active' => true,
            'tracking_mode' => ToolTrackingMode::Quantity,
            'total_qty' => 8,
            'qty_in_repair' => 0,
        ]);

        $issuedTo = $this->productionManager();

        $issuance = $this->service->issue(
            tool: $tool,
            issuedTo: $issuedTo,
            issuedBy: $this->issuer,
            quantity: 2,
        );

        $this->service->returnTool(
            issuance: $issuance,
            conditionIn: ToolCondition::Damaged->value,
            damageNotes: 'Cracked vials',
        );

        $incident = ToolIncident::query()->where('tool_id', $tool->id)->first();
        $this->assertNotNull($incident);
        $this->assertSame(ToolIncidentType::Damage, $incident->type);
        $this->assertSame(ToolIncidentStatus::Open, $incident->status);
        $this->assertSame($issuedTo->id, $incident->responsible_user_id);
        $this->assertSame(2, (int) $incident->quantity);
        $this->assertSame(2, (int) $tool->fresh()->qty_in_repair);
        $this->assertSame(6, $tool->fresh()->availableQty());
    }

    public function test_incident_repaired_releases_qty_in_repair(): void
    {
        $tool = Tool::query()->create([
            'tool_code' => 'TL-QTY-REP',
            'name' => 'Clamps',
            'tool_type' => 'Fabrication',
            'condition' => ToolCondition::Good,
            'is_active' => true,
            'tracking_mode' => ToolTrackingMode::Quantity,
            'total_qty' => 5,
            'qty_in_repair' => 0,
        ]);

        $incident = app(ToolIncidentService::class)->report($this->issuer, [
            'tool' => $tool,
            'responsible_user_id' => $this->productionManager()->id,
            'type' => ToolIncidentType::Damage,
            'quantity' => 2,
            'notes' => 'Bent jaws',
        ]);

        $this->assertSame(2, (int) $tool->fresh()->qty_in_repair);
        $this->assertSame(3, $tool->fresh()->availableQty());

        app(ToolIncidentService::class)->resolve($incident, [
            'status' => ToolIncidentStatus::Repaired,
            'resolution_notes' => 'Straightened',
        ]);

        $this->assertSame(0, (int) $tool->fresh()->qty_in_repair);
        $this->assertSame(5, $tool->fresh()->availableQty());
    }
}
