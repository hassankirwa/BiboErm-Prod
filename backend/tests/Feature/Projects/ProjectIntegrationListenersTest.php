<?php

namespace Tests\Feature\Projects;

use App\Enums\ProjectStage;
use App\Events\Production\ProductionStageCompleted;
use App\Events\Projects\ProjectBomFinalized;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Listeners\Projects\OnProductionStageCompleted;
use App\Listeners\Projects\OnProjectBomFinalized;
use App\Listeners\Projects\OnProjectMaterialShortageDetected;
use App\Listeners\Projects\OnProjectMaterialsReady;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectIntegrationListenersTest extends TestCase
{
    use RefreshDatabase;

    public function test_bom_finalized_listener_moves_project_to_material_check_once(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject([
            'stage' => ProjectStage::BomFinalized->value,
        ]);

        $listener = app(OnProjectBomFinalized::class);
        $event = new ProjectBomFinalized(
            projectId: $project->id,
            bomId: 10,
            version: 1,
            finalizedByUserId: $user->id,
            lineSummary: [],
        );

        $listener->handle($event);
        $listener->handle($event);

        $project->refresh();

        $this->assertSame(ProjectStage::MaterialCheck, $project->stage);
        $this->assertDatabaseCount('project_stage_logs', 1);
        $this->assertDatabaseHas('project_stage_logs', [
            'project_id' => $project->id,
            'from_stage' => ProjectStage::BomFinalized->value,
            'to_stage' => ProjectStage::MaterialCheck->value,
            'delay_reason' => 'bom_stock_check_requested',
        ]);
    }

    public function test_shortage_listener_moves_project_to_awaiting_procurement_and_logs_delay(): void
    {
        config()->set('bibo.pm.log_procurement_delay_on_shortage', true);

        $project = $this->makeProject([
            'stage' => ProjectStage::MaterialCheck->value,
        ]);

        $listener = app(OnProjectMaterialShortageDetected::class);

        $listener->handle(new ProjectMaterialShortageDetected(
            projectId: $project->id,
            reservationId: null,
            shortageLines: [[
                'project_bom_line_id' => 1,
                'warehouse_item_id' => 99,
                'qty_required' => 8,
                'qty_available' => 2,
                'qty_short' => 6,
            ]],
        ));

        $project->refresh();

        $this->assertSame(ProjectStage::AwaitingProcurement, $project->stage);
        $this->assertDatabaseHas('project_delays', [
            'project_id' => $project->id,
            'stage' => ProjectStage::AwaitingProcurement->value,
            'reason' => 'procurement',
        ]);
    }

    public function test_materials_ready_listener_moves_project_forward(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::AwaitingProcurement->value,
        ]);

        app(OnProjectMaterialsReady::class)->handle(new ProjectMaterialsReady(
            projectId: $project->id,
            reservationId: 12,
            fifoSequence: 3,
        ));

        $this->assertSame(ProjectStage::MaterialsReady, $project->fresh()->stage);
        $this->assertDatabaseHas('project_stage_logs', [
            'project_id' => $project->id,
            'from_stage' => ProjectStage::AwaitingProcurement->value,
            'to_stage' => ProjectStage::MaterialsReady->value,
            'delay_reason' => 'warehouse_materials_ready',
        ]);
    }

    public function test_production_stage_listener_maps_completed_stages_back_into_pm(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::MaterialsReady->value,
        ]);

        $listener = app(OnProductionStageCompleted::class);

        $listener->handle(new ProductionStageCompleted($project->id, 1, 'cutting'));
        $this->assertSame(ProjectStage::CuttingStage, $project->fresh()->stage);

        $listener->handle(new ProductionStageCompleted($project->id, 1, 'fabrication'));
        $this->assertSame(ProjectStage::FabricationStage, $project->fresh()->stage);

        $listener->handle(new ProductionStageCompleted($project->id, 1, 'glass_assembly'));
        $this->assertSame(ProjectStage::GlassAssembly, $project->fresh()->stage);

        $listener->handle(new ProductionStageCompleted($project->id, 1, 'qc_post_fabrication'));
        $this->assertSame(ProjectStage::QcPreInstallation, $project->fresh()->stage);

        $this->assertDatabaseHas('project_stage_logs', [
            'project_id' => $project->id,
            'from_stage' => ProjectStage::GlassAssembly->value,
            'to_stage' => ProjectStage::QcPreInstallation->value,
            'delay_reason' => 'production_stage:qc_post_fabrication',
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Listener Test Project',
            'stage' => ProjectStage::AwaitingDeposit->value,
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ], $attributes));
    }
}
