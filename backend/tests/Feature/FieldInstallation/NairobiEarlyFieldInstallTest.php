<?php

namespace Tests\Feature\FieldInstallation;

use App\Enums\InstallMode;
use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Enums\ProjectStage;
use App\Events\Production\ProductionStageCompleted;
use App\Listeners\FieldInstallation\ForwardNairobiFieldOnSashComplete;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Production\ProductionOrder;
use App\Models\Production\ProductionStageLog;
use App\Models\Project;
use App\Models\User;
use App\Services\FieldInstallation\FieldInstallationJobService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class NairobiEarlyFieldInstallTest extends TestCase
{
    use RefreshDatabase;

    protected User $actor;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Permission::findOrCreate('field_installation.manage');
        Permission::findOrCreate('field_installation.log');

        $this->actor = User::factory()->create();
        $this->actor->givePermissionTo(['field_installation.manage', 'field_installation.log']);
    }

    public function test_nairobi_project_can_create_field_job_after_sash_complete(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-NBO-'.uniqid(),
            'name' => 'Nairobi Early Field',
            'stage' => ProjectStage::FabricationStage,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        $order = ProductionOrder::query()->create([
            'reference' => 'PROD-NBO-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::GlassAssembly,
            'fifo_position' => 1,
        ]);

        ProductionStageLog::query()->create([
            'production_order_id' => $order->id,
            'stage' => ProductionStage::Sash,
            'status' => 'completed',
            'started_at' => now()->subHour(),
            'completed_at' => now(),
            'completed_by' => $this->actor->id,
        ]);

        $job = app(FieldInstallationJobService::class)->create($this->actor, [
            'project_id' => $project->id,
            'notes' => 'Early sash install',
        ]);

        $this->assertSame($project->id, $job->project_id);
        $this->assertSame($order->id, $job->production_order_id);
    }

    public function test_nairobi_blocked_when_only_cutting_complete(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-NBO-CUT-'.uniqid(),
            'name' => 'Nairobi Cut Only',
            'stage' => ProjectStage::FabricationStage,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        $order = ProductionOrder::query()->create([
            'reference' => 'PROD-NBO-CUT-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::Fabrication,
            'fifo_position' => 1,
        ]);

        ProductionStageLog::query()->create([
            'production_order_id' => $order->id,
            'stage' => ProductionStage::Cutting,
            'status' => 'completed',
            'started_at' => now()->subHour(),
            'completed_at' => now(),
            'completed_by' => $this->actor->id,
        ]);

        $this->expectException(ValidationException::class);

        app(FieldInstallationJobService::class)->create($this->actor, [
            'project_id' => $project->id,
        ]);
    }

    public function test_outside_nairobi_still_requires_qc_pre_installation(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-OUT-'.uniqid(),
            'name' => 'Outside Project',
            'stage' => ProjectStage::FabricationStage,
            'type' => 'residential',
            'location_type' => 'outside_nairobi',
            'install_mode' => InstallMode::OutsideFullInstall,
        ]);

        $this->expectException(ValidationException::class);

        app(FieldInstallationJobService::class)->create($this->actor, [
            'project_id' => $project->id,
        ]);
    }

    public function test_nairobi_blocked_before_sash_complete(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-NBO2-'.uniqid(),
            'name' => 'Nairobi Pre Sash',
            'stage' => ProjectStage::MaterialsReady,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        ProductionOrder::query()->create([
            'reference' => 'PROD-NBO2-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::Sash,
            'fifo_position' => 1,
        ]);

        $this->expectException(ValidationException::class);

        app(FieldInstallationJobService::class)->create($this->actor, [
            'project_id' => $project->id,
        ]);
    }

    public function test_sash_complete_auto_creates_nairobi_field_job(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-NBO-AUTO-'.uniqid(),
            'name' => 'Nairobi Auto Field',
            'stage' => ProjectStage::FabricationStage,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        $order = ProductionOrder::query()->create([
            'reference' => 'PROD-NBO-AUTO-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::GlassAssembly,
            'fifo_position' => 1,
        ]);

        ProductionStageLog::query()->create([
            'production_order_id' => $order->id,
            'stage' => ProductionStage::Sash,
            'status' => 'completed',
            'started_at' => now()->subHour(),
            'completed_at' => now(),
            'completed_by' => $this->actor->id,
        ]);

        app(ForwardNairobiFieldOnSashComplete::class)->handle(new ProductionStageCompleted(
            projectId: $project->id,
            productionOrderId: $order->id,
            productionStage: 'sash',
            completedByUserId: $this->actor->id,
        ));

        $this->assertTrue(
            FieldInstallationJob::query()->where('project_id', $project->id)->exists()
        );
    }

    public function test_outside_sash_complete_does_not_auto_create_field_job(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-OUT-AUTO-'.uniqid(),
            'name' => 'Outside Auto Field',
            'stage' => ProjectStage::FabricationStage,
            'type' => 'residential',
            'location_type' => 'outside_nairobi',
            'install_mode' => InstallMode::OutsideFullInstall,
        ]);

        $order = ProductionOrder::query()->create([
            'reference' => 'PROD-OUT-AUTO-'.uniqid(),
            'project_id' => $project->id,
            'status' => ProductionOrderStatus::InProgress,
            'current_stage' => ProductionStage::GlassAssembly,
            'fifo_position' => 1,
        ]);

        ProductionStageLog::query()->create([
            'production_order_id' => $order->id,
            'stage' => ProductionStage::Sash,
            'status' => 'completed',
            'started_at' => now()->subHour(),
            'completed_at' => now(),
            'completed_by' => $this->actor->id,
        ]);

        app(ForwardNairobiFieldOnSashComplete::class)->handle(new ProductionStageCompleted(
            projectId: $project->id,
            productionOrderId: $order->id,
            productionStage: 'sash',
            completedByUserId: $this->actor->id,
        ));

        $this->assertFalse(
            FieldInstallationJob::query()->where('project_id', $project->id)->exists()
        );
    }
}
