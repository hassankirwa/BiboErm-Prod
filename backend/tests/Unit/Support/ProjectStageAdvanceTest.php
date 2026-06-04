<?php

namespace Tests\Unit\Support;

use App\Enums\ProjectStage;
use App\Models\User;
use App\Support\ProjectStageAdvance;
use App\Support\ProjectStageLabels;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProjectStageAdvanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'projects.advance_stage',
            'projects.advance_stage_warehouse',
            'projects.advance_stage_production',
        ] as $permission) {
            Permission::findOrCreate($permission);
        }
    }

    public function test_stage_labels_include_material_check(): void
    {
        $this->assertSame('Material check', ProjectStageLabels::for(ProjectStage::MaterialCheck));
        $this->assertSame('Materials ready', ProjectStageLabels::for(ProjectStage::MaterialsReady));
    }

    public function test_warehouse_user_can_advance_materials_reserved_to_ready(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('projects.advance_stage_warehouse');

        $this->assertTrue(
            ProjectStageAdvance::userCanAdvanceTo(
                $user,
                ProjectStage::MaterialsReserved,
                ProjectStage::MaterialsReady,
            )
        );
    }

    public function test_warehouse_user_cannot_advance_pm_stages(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('projects.advance_stage_warehouse');

        $this->assertFalse(
            ProjectStageAdvance::userCanAdvanceTo(
                $user,
                ProjectStage::SiteAssessment,
                ProjectStage::FinalDesignApproval,
            )
        );
    }

    public function test_production_user_can_advance_cutting_to_fabrication(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('projects.advance_stage_production');

        $this->assertTrue(
            ProjectStageAdvance::userCanAdvanceTo(
                $user,
                ProjectStage::CuttingStage,
                ProjectStage::FabricationStage,
            )
        );
    }
}
