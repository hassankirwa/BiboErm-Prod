<?php

namespace Tests\Unit\Projects;

use App\Enums\ProjectStage;
use App\Events\Projects\ProjectBomFinalized;
use App\Events\Warehouse\ProjectMaterialsReserved;
use App\Listeners\Projects\OnProjectBomFinalized;
use App\Listeners\Projects\OnProjectMaterialsReserved;
use App\Listeners\Warehouse\HandleProjectBomFinalized;
use App\Models\Project;
use App\Services\Projects\ProjectStageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectMaterialStageFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_bom_finalized_transitions_to_material_check_not_materials_ready(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::BomFinalized->value]);

        app(OnProjectBomFinalized::class)->handle(new ProjectBomFinalized(
            projectId: $project->id,
            bomId: 1,
            version: 1,
            finalizedByUserId: 1,
            lineSummary: [],
        ));

        $this->assertSame(
            ProjectStage::MaterialCheck,
            app(ProjectStageService::class)->currentStage($project->fresh())
        );
    }

    public function test_material_check_cannot_skip_directly_to_materials_ready(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);
        $service = app(ProjectStageService::class);

        $this->assertFalse($service->canTransition($project, ProjectStage::MaterialsReady));
        $this->assertTrue($service->canTransition($project, ProjectStage::MaterialsReserved));
        $this->assertTrue($service->canTransition($project, ProjectStage::AwaitingProcurement));
    }

    public function test_reservation_event_moves_project_to_materials_reserved(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);

        app(OnProjectMaterialsReserved::class)->handle(new ProjectMaterialsReserved(
            projectId: $project->id,
            reservationId: 10,
            fifoSequence: 1,
        ));

        $this->assertSame(
            ProjectStage::MaterialsReserved,
            app(ProjectStageService::class)->currentStage($project->fresh())
        );
    }

    public function test_reservation_event_does_not_auto_advance_to_materials_ready(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);

        app(OnProjectMaterialsReserved::class)->handle(new ProjectMaterialsReserved(
            projectId: $project->id,
            reservationId: 10,
            fifoSequence: 1,
        ));

        $this->assertNotSame(
            ProjectStage::MaterialsReady,
            app(ProjectStageService::class)->currentStage($project->fresh())
        );
    }

    public function test_bom_finalized_with_no_stockable_lines_stays_on_material_check(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);

        app(HandleProjectBomFinalized::class)->handle(new ProjectBomFinalized(
            projectId: $project->id,
            bomId: 1,
            version: 1,
            finalizedByUserId: 1,
            lineSummary: [],
        ));

        $this->assertSame(
            ProjectStage::MaterialCheck,
            app(ProjectStageService::class)->currentStage($project->fresh())
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Material Flow Project',
            'stage' => ProjectStage::MaterialCheck->value,
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ], $attributes));
    }
}
