<?php

namespace Tests\Unit\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Services\Projects\ProjectStageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectStageServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_initializes_the_stage_log_once_and_sets_completion_percent(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::AwaitingDeposit->value,
        ]);

        $service = app(ProjectStageService::class);

        $service->initialize($project);
        $service->initialize($project->fresh());

        $project->refresh();

        $this->assertSame(5, $project->completion_percent);
        $this->assertDatabaseCount('project_stage_logs', 1);
        $this->assertDatabaseHas('project_stage_logs', [
            'project_id' => $project->id,
            'from_stage' => null,
            'to_stage' => ProjectStage::AwaitingDeposit->value,
        ]);
    }

    public function test_it_rejects_invalid_stage_skips(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::AwaitingDeposit->value,
        ]);

        $service = app(ProjectStageService::class);
        $service->initialize($project);

        try {
            $service->transition($project, ProjectStage::BomFinalized);
            $this->fail('Expected invalid stage skip to throw.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('stage', $exception->errors());
        }

        $this->assertSame(ProjectStage::AwaitingDeposit, $project->fresh()->stage);
        $this->assertDatabaseCount('project_stage_logs', 1);
    }

    public function test_nairobi_projects_follow_full_install_stages_after_fabrication(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::QcPreInstallation->value,
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ]);

        $service = app(ProjectStageService::class);

        $this->assertTrue($service->canTransition($project, ProjectStage::InTransit));
        $this->assertFalse($service->canTransition($project, ProjectStage::ProjectComplete));

        $service->transition($project, ProjectStage::InTransit);
        $project->refresh();

        $this->assertSame(ProjectStage::InTransit, $project->stage);
        $this->assertTrue($service->canTransition($project, ProjectStage::Installation));

        $service->transition($project, ProjectStage::Installation);
        $project->refresh();

        $this->assertSame(ProjectStage::Installation, $project->stage);
        $this->assertTrue($service->canTransition($project, ProjectStage::SiteQc));
    }

    public function test_outside_nairobi_projects_also_transition_through_install_stages(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::QcPreInstallation->value,
            'location_type' => 'outside_nairobi',
        ]);

        $service = app(ProjectStageService::class);

        $this->assertTrue($service->canTransition($project, ProjectStage::InTransit));
        $this->assertFalse($service->canTransition($project, ProjectStage::ProjectComplete));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Test Project',
            'stage' => ProjectStage::AwaitingDeposit->value,
            'type' => 'full_install',
            'location_type' => 'nairobi',
        ], $attributes));
    }
}
