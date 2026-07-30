<?php

namespace Tests\Feature\Projects;

use App\Enums\ProjectStage;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\ProjectDocument;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdvanceToFinalDesignApprovalGateTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
        ]);

        $this->user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->user->assignRole('project_manager');
    }

    public function test_cannot_advance_to_final_design_approval_without_design_and_bom(): void
    {
        $project = $this->makeProject([
            'stage' => ProjectStage::SiteAssessment->value,
            'project_manager_id' => $this->user->id,
            'stage_data' => [
                'site_measurement' => [
                    'status' => 'approved',
                    'lines' => [
                        [
                            'ref' => 'A1',
                            'width_centre_mm' => 1200,
                            'height_centre_mm' => 2100,
                        ],
                    ],
                ],
            ],
        ]);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::FinalDesignApproval->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['documents']);

        ProjectDocument::query()->create([
            'project_id' => $project->id,
            'type' => 'design',
            'filename' => 'plan.pdf',
            'path' => 'project-documents/plan.pdf',
            'version' => 1,
            'uploaded_by' => $this->user->id,
        ]);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::FinalDesignApproval->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['bom']);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'draft',
            'uploaded_by' => $this->user->id,
        ]);

        ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'accessory',
            'material_name' => 'Handle',
            'quantity' => 2,
            'sort_order' => 0,
        ]);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::FinalDesignApproval->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.stage', ProjectStage::FinalDesignApproval->value);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Advance Gate Project',
            'type' => 'full_install',
            'location_type' => 'nairobi',
            'stage' => ProjectStage::SiteAssessment->value,
            'is_active' => true,
            'completion_percent' => 15,
            'priority' => 'normal',
        ], $attributes));
    }
}
