<?php

namespace Tests\Feature\Warehouse;

use App\Models\Warehouse\ToolIssuance;

class WarehouseToolsTest extends WarehouseFeatureTestCase
{
    public function test_tools_index_lists_seeded_tools(): void
    {
        $user = $this->warehouseAluminiumManager();

        $this->actingAsSanctum($user)
            ->getJson('/api/v1/warehouse/tools')
            ->assertOk()
            ->assertJsonFragment(['tool_code' => 'TL-CUT-001']);
    }

    public function test_create_tool(): void
    {
        $user = $this->warehouseAluminiumManager();

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/tools', [
                'tool_code' => 'TL-TEST-001',
                'name' => 'Test Crimping Tool',
                'tool_type' => 'Fabrication',
                'condition' => 'good',
            ])
            ->assertCreated()
            ->assertJsonFragment(['tool_code' => 'TL-TEST-001']);
    }

    public function test_issue_and_return_tool(): void
    {
        $manager = $this->warehouseAluminiumManager();
        $employee = $this->warehouseAccessoriesManager();
        $project = $this->createTestProject();
        $tool = $this->toolByCode('TL-DRLL-001');

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/tools/{$tool->id}/issue", [
                'issued_to' => $employee->id,
                'project_id' => $project->id,
                'condition_out' => 'good',
            ])
            ->assertOk()
            ->assertJsonFragment(['tool_code' => 'TL-DRLL-001']);

        $issuance = ToolIssuance::query()
            ->where('tool_id', $tool->id)
            ->whereNull('return_date')
            ->firstOrFail();

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/tools/issuances/{$issuance->id}/return", [
                'condition_in' => 'fair',
                'damage_notes' => 'Minor wear on chuck',
            ])
            ->assertOk()
            ->assertJsonFragment([
                'tool_id' => $tool->id,
                'condition_in' => 'fair',
            ]);

        $this->assertDatabaseHas('tool_issuances', [
            'id' => $issuance->id,
            'condition_in' => 'fair',
        ]);
    }

    public function test_quantity_tool_issue_return_and_damaged_incident(): void
    {
        $manager = $this->warehouseAluminiumManager();
        $employee = $this->warehouseAccessoriesManager();

        $create = $this->actingAsSanctum($manager)
            ->postJson('/api/v1/warehouse/tools', [
                'tool_code' => 'TL-QTY-API',
                'name' => 'Cable Ties Pack',
                'tool_type' => 'Consumable',
                'tracking_mode' => 'quantity',
                'total_qty' => 20,
            ])
            ->assertCreated()
            ->json('data');

        $toolId = $create['id'];

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/tools/{$toolId}/issue", [
                'issued_to' => $employee->id,
                'quantity' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('data.available_qty', 15)
            ->assertJsonPath('data.issued_qty', 5);

        $issuance = ToolIssuance::query()
            ->where('tool_id', $toolId)
            ->whereNull('return_date')
            ->firstOrFail();

        $this->assertSame(5, (int) $issuance->quantity);

        $this->actingAsSanctum($manager)
            ->postJson("/api/v1/warehouse/tools/issuances/{$issuance->id}/return", [
                'condition_in' => 'damaged',
                'damage_notes' => 'Sun-brittle batch',
            ])
            ->assertOk();

        $this->assertDatabaseHas('tool_incidents', [
            'tool_id' => $toolId,
            'issuance_id' => $issuance->id,
            'type' => 'damage',
            'status' => 'open',
            'responsible_user_id' => $employee->id,
            'quantity' => 5,
        ]);

        $this->actingAsSanctum($manager)
            ->getJson('/api/v1/warehouse/tools/incidents?tool_id='.$toolId)
            ->assertOk()
            ->assertJsonFragment(['tool_id' => $toolId, 'type' => 'damage']);

        $this->actingAsSanctum($manager)
            ->getJson('/api/v1/warehouse/tools')
            ->assertOk()
            ->assertJsonFragment([
                'tool_code' => 'TL-QTY-API',
                'qty_in_repair' => 5,
                'available_qty' => 15,
            ]);
    }

    public function test_procurement_officer_cannot_issue_tools(): void
    {
        $user = $this->procurementOfficer();
        $employee = $this->warehouseAluminiumManager();
        $tool = $this->toolByCode('TL-CUT-001');

        $this->actingAsSanctum($user)
            ->postJson("/api/v1/warehouse/tools/{$tool->id}/issue", [
                'issued_to' => $employee->id,
            ])
            ->assertForbidden();
    }

    public function test_procurement_officer_cannot_manage_tools(): void
    {
        $user = $this->procurementOfficer();

        $this->actingAsSanctum($user)
            ->postJson('/api/v1/warehouse/tools', [
                'tool_code' => 'TL-FORBIDDEN',
                'name' => 'Forbidden Tool',
            ])
            ->assertForbidden();
    }
}
