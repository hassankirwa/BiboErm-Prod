<?php

namespace Tests\Feature\ClientPortal;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\ProjectStage;
use App\Http\Controllers\ClientPortal\ClientPortalController;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use Tests\TestCase;

class ClientPortalJourneyProductionTest extends TestCase
{
    use RefreshDatabase;

    public function test_journey_production_complete_when_po_completed_at_qc_pre_stage(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-PORTAL-'.uniqid(),
            'name' => 'Client Portal Journey',
            'stage' => ProjectStage::QcPreInstallation,
            'type' => 'residential',
            'location_type' => 'nairobi',
        ]);

        ProductionOrder::query()->create([
            'reference' => 'PROD-PORTAL-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::Completed,
            'current_stage' => 'qc_post_fabrication',
            'fifo_position' => 1,
            'actual_end' => now()->toDateString(),
        ]);

        $controller = app(ClientPortalController::class);
        $method = new ReflectionMethod($controller, 'journey');
        $method->setAccessible(true);

        /** @var list<array{key: string, state: string}> $journey */
        $journey = $method->invoke($controller, $project);

        $production = collect($journey)->firstWhere('key', 'production');
        $this->assertNotNull($production);
        $this->assertSame('complete', $production['state']);
    }
}
