<?php

namespace Tests\Feature\Projects;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\FieldInstallation\FieldJobType;
use App\Enums\FieldInstallation\NonConformitySeverity;
use App\Enums\FieldInstallation\NonConformityType;
use App\Enums\InstallMode;
use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Enums\Projects\DesignChangeOrderStatus;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use App\Models\Projects\DesignChangeOrder;
use App\Models\User;
use App\Services\FieldInstallation\FieldNonConformityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class DesignChangeOrderRemakeTest extends TestCase
{
    use RefreshDatabase;

    protected User $actor;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ([
            'projects.view',
            'projects.view_all',
            'projects.advance_stage',
            'projects.manage',
            'field_installation.view',
            'field_installation.log',
            'field_installation.manage',
        ] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->actor = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->actor->givePermissionTo([
            'projects.view',
            'projects.view_all',
            'projects.advance_stage',
            'projects.manage',
            'field_installation.view',
            'field_installation.log',
            'field_installation.manage',
        ]);
    }

    public function test_wrong_measurement_nc_creates_draft_design_change_order(): void
    {
        [$project, $job, $parentOrder] = $this->seedInstallationContext();

        app(FieldNonConformityService::class)->report($job, $this->actor, [
            'nc_type' => NonConformityType::WrongMeasurement->value,
            'severity' => NonConformitySeverity::Major->value,
            'title' => 'Opening W incorrect',
            'description' => 'Measured width is 40mm short of fabrication.',
        ]);

        $dco = DesignChangeOrder::query()->where('project_id', $project->id)->first();

        $this->assertNotNull($dco);
        $this->assertSame(DesignChangeOrderStatus::Drafted, $dco->status);
        $this->assertNotNull($dco->field_non_conformity_id);
        $this->assertSame($parentOrder->id, $dco->parent_production_order_id);
    }

    public function test_approve_and_create_remake_creates_production_order(): void
    {
        [$project, $job, $parentOrder] = $this->seedInstallationContext();

        $nc = app(FieldNonConformityService::class)->report($job, $this->actor, [
            'nc_type' => NonConformityType::DimensionMismatch->value,
            'severity' => NonConformitySeverity::Critical->value,
            'title' => 'Height mismatch',
            'description' => 'Frame height does not match site opening.',
        ]);

        $dco = DesignChangeOrder::query()
            ->where('field_non_conformity_id', $nc->id)
            ->firstOrFail();

        Sanctum::actingAs($this->actor);

        $this->postJson("/api/v1/projects/design-change-orders/{$dco->id}/approve", [
            'target_stage' => ProjectStage::SiteAssessment->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', DesignChangeOrderStatus::AwaitingRemeasure->value);

        $this->assertSame(ProjectStage::SiteAssessment, $project->fresh()->stage);
        $this->assertSame(ProductionOrderStatus::OnHold, $parentOrder->fresh()->status);

        $this->postJson("/api/v1/projects/design-change-orders/{$dco->id}/create-remake")
            ->assertOk()
            ->assertJsonPath('data.status', DesignChangeOrderStatus::RemakeInProduction->value);

        $dco->refresh();
        $this->assertNotNull($dco->remake_production_order_id);

        $remake = ProductionOrder::query()->findOrFail($dco->remake_production_order_id);
        $this->assertSame($parentOrder->id, $remake->parent_production_order_id);
        $this->assertSame(ProductionOrderStatus::Scheduled, $remake->status);
        $this->assertSame($project->id, $remake->project_id);
        $this->assertSame(2, ProductionOrder::query()->where('project_id', $project->id)->count());
    }

    public function test_field_design_change_endpoint_creates_nc_and_dco(): void
    {
        [$project, $job] = $this->seedInstallationContext();

        Sanctum::actingAs($this->actor);

        $response = $this->postJson("/api/v1/field-installation/jobs/{$job->id}/design-changes", [
            'nc_type' => NonConformityType::WrongMeasurement->value,
            'severity' => NonConformitySeverity::Major->value,
            'title' => 'Wrong W on sash',
            'description' => 'Sash width wrong vs opening.',
            'measurement_notes' => ['opening_w_mm' => 1200],
        ])->assertCreated();

        $response->assertJsonPath('data.non_conformity.nc_type', NonConformityType::WrongMeasurement->value);
        $response->assertJsonPath('data.design_change_order.status', DesignChangeOrderStatus::Drafted->value);

        $this->assertSame(1, DesignChangeOrder::query()->where('project_id', $project->id)->count());
    }

    /**
     * @return array{0: Project, 1: FieldInstallationJob, 2: ProductionOrder}
     */
    protected function seedInstallationContext(): array
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-DCO-'.uniqid(),
            'name' => 'DCO Remake Project',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        $parentOrder = ProductionOrder::query()->create([
            'reference' => 'PROD-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::Fabrication,
            'fifo_position' => 1,
            'actual_start' => now()->toDateString(),
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-'.uniqid(),
            'project_id' => $project->id,
            'production_order_id' => $parentOrder->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::InProgress,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
            'actual_start' => now()->subDay(),
        ]);

        return [$project, $job, $parentOrder];
    }
}
