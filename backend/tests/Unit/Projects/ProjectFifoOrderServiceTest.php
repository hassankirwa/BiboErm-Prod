<?php

namespace Tests\Unit\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Services\Projects\ProjectFifoOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProjectFifoOrderServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_positions_rank_active_incomplete_projects_by_id(): void
    {
        $first = $this->makeProject(['stage' => ProjectStage::DepositReceived->value]);
        $second = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);
        $completed = $this->makeProject(['stage' => ProjectStage::ProjectComplete->value]);
        $inactive = $this->makeProject([
            'stage' => ProjectStage::SiteAssessment->value,
            'is_active' => false,
        ]);

        $service = app(ProjectFifoOrderService::class);

        $this->assertSame(1, $service->positionFor($first->id));
        $this->assertSame(2, $service->positionFor($second->id));
        $this->assertNull($service->positionFor($completed->id));
        $this->assertNull($service->positionFor($inactive->id));
    }

    public function test_completing_an_earlier_project_shrinks_later_numbers(): void
    {
        $first = $this->makeProject(['stage' => ProjectStage::DepositReceived->value]);
        $second = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);
        $third = $this->makeProject(['stage' => ProjectStage::AwaitingProcurement->value]);

        $service = app(ProjectFifoOrderService::class);

        $this->assertSame(1, $service->positionFor($first->id));
        $this->assertSame(2, $service->positionFor($second->id));
        $this->assertSame(3, $service->positionFor($third->id));

        $first->forceFill(['stage' => ProjectStage::ProjectComplete->value])->save();

        // once() cache is request-scoped; resolve a fresh instance for post-complete ranks
        $fresh = new ProjectFifoOrderService;

        $this->assertNull($fresh->positionFor($first->id));
        $this->assertSame(1, $fresh->positionFor($second->id));
        $this->assertSame(2, $fresh->positionFor($third->id));
    }

    public function test_fifo_sequence_resolver_uses_global_order(): void
    {
        $design = $this->makeProject(['stage' => ProjectStage::SiteAssessment->value]);
        $materials = $this->makeProject(['stage' => ProjectStage::MaterialCheck->value]);

        $resolver = app(\App\Services\Warehouse\Reservations\FifoSequenceResolver::class);

        $this->assertSame(1, $resolver->sequenceForProject($design->id));
        $this->assertSame(2, $resolver->sequenceForProject($materials->id));
        $this->assertSame([], $resolver->projectIdsAheadOf($materials->id));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'FIFO Test Project',
            'type' => 'residential',
            'location_type' => 'nairobi',
            'stage' => ProjectStage::DepositReceived->value,
            'is_active' => true,
            'completion_percent' => 0,
            'priority' => 'normal',
        ], $attributes));
    }
}
