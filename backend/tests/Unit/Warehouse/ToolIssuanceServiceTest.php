<?php

namespace Tests\Unit\Warehouse;

use App\Enums\Warehouse\ToolCondition;
use App\Events\Warehouse\ToolReplacementRequired;
use App\Models\User;
use App\Services\Warehouse\Tools\ToolIssuanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
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
}
