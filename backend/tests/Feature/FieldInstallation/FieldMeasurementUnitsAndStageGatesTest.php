<?php

namespace Tests\Feature\FieldInstallation;

use App\Enums\FieldInstallation\FieldJobStatus;
use App\Enums\FieldInstallation\FieldJobType;
use App\Enums\FieldInstallation\FieldUnitStatus;
use App\Enums\InstallMode;
use App\Enums\Procurement\DriverStatus;
use App\Enums\ProjectStage;
use App\Enums\Projects\ProjectDispatchStatus;
use App\Enums\Warehouse\ToolCondition;
use App\Enums\Warehouse\ToolTrackingMode;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\FieldInstallation\FieldToolAssignment;
use App\Models\Procurement\Driver;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\ProjectFloor;
use App\Models\Projects\ProjectDispatch;
use App\Models\User;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\ToolIssuance;
use App\Services\FieldInstallation\FieldInstallationJobService;
use App\Services\FieldInstallation\FieldUnitProgressService;
use App\Services\Projects\ProjectStageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class FieldMeasurementUnitsAndStageGatesTest extends TestCase
{
    use RefreshDatabase;

    protected User $actor;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        Permission::findOrCreate('field_installation.manage');
        Permission::findOrCreate('field_installation.log');
        Permission::findOrCreate('projects.advance_stage');
        Permission::findOrCreate('projects.manage');
        Permission::findOrCreate('projects.view_all');

        $this->actor = User::factory()->create();
        $this->actor->givePermissionTo([
            'field_installation.manage',
            'field_installation.log',
            'projects.advance_stage',
            'projects.manage',
            'projects.view_all',
        ]);
    }

    public function test_generate_from_measurements_creates_units_from_stage_data_not_bom(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-MEAS-'.uniqid(),
            'name' => 'Measurement Units',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
            'stage_data' => [
                'site_measurement' => [
                    'lines' => [
                        [
                            'ref' => 'D01',
                            'unit_floor' => 'Ground',
                            'room_location' => 'Living',
                            'product_type' => 'Sliding Door',
                            'quantity' => 2,
                            'width_centre_mm' => 1200,
                            'height_centre_mm' => 2100,
                            'sort_order' => 0,
                        ],
                        [
                            'ref' => '',
                            'unit_floor' => '',
                            'room_location' => '',
                            'product_type' => '',
                            'quantity' => 1,
                            'sort_order' => 1,
                        ],
                        [
                            'ref' => 'W02',
                            'unit_floor' => 'First',
                            'room_location' => 'Bedroom',
                            'product_type' => 'Casement Window',
                            'quantity' => 1,
                            'width_centre_mm' => 900,
                            'height_centre_mm' => 1200,
                            'sort_order' => 2,
                        ],
                    ],
                ],
            ],
        ]);

        ProjectFloor::query()->create([
            'project_id' => $project->id,
            'floor_label' => 'Ground',
            'sort_order' => 0,
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $project->id,
            'version' => 1,
            'status' => 'finalized',
        ]);

        ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'profile',
            'material_code' => 'PROF-SIDE',
            'material_name' => 'Side frame',
            'quantity' => 10,
            'sort_order' => 0,
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-MEAS-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::Scheduled,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        FieldInstallationUnit::query()->create([
            'job_id' => $job->id,
            'unit_label' => 'Side frame',
            'status' => FieldUnitStatus::Pending,
            'sort_order' => 0,
            'measurement_line_key' => null,
        ]);

        $created = app(FieldUnitProgressService::class)->generateFromMeasurements($job);

        $this->assertSame(2, $created);

        $units = $job->units()->orderBy('sort_order')->get();
        $this->assertCount(2, $units);
        $this->assertSame('line-0-D01', $units[0]->measurement_line_key);
        $this->assertSame(2, $units[0]->quantity);
        $this->assertSame('D01', $units[0]->opening_ref);
        $this->assertSame('Sliding Door', $units[0]->product_type);
        $this->assertSame('Ground', $units[0]->unit_floor);
        $this->assertSame('Living', $units[0]->room_location);
        $this->assertStringContainsString('Ground', $units[0]->unit_label);
        $this->assertStringContainsString('D01', $units[0]->unit_label);
        $this->assertNotNull($units[0]->project_floor_id);
        $this->assertSame('line-2-W02', $units[1]->measurement_line_key);
        $this->assertDatabaseMissing('field_installation_units', [
            'job_id' => $job->id,
            'unit_label' => 'Side frame',
        ]);
    }

    public function test_start_without_tools_fails(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-TOOLS-'.uniqid(),
            'name' => 'Tools Gate',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-TOOLS-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::Scheduled,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        try {
            app(FieldInstallationJobService::class)->start($job, $this->actor);
            $this->fail('Expected ValidationException when starting without tools.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('tools', $e->errors());
            $this->assertStringContainsString(
                'Warehouse must allocate equipment to this project before starting.',
                $e->errors()['tools'][0],
            );
        }

        $this->assertSame(FieldJobStatus::Scheduled, $job->fresh()->status);
    }

    public function test_start_with_tool_assignment_succeeds(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-TOOLS-OK-'.uniqid(),
            'name' => 'Tools Ok',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
            'stage_data' => [
                'site_measurement' => [
                    'lines' => [
                        [
                            'ref' => 'D01',
                            'unit_floor' => 'Ground',
                            'product_type' => 'Door',
                            'quantity' => 1,
                            'sort_order' => 0,
                        ],
                    ],
                ],
            ],
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-TOOLS-OK-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::Scheduled,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        $this->assignToolToJob($job);

        $started = app(FieldInstallationJobService::class)->start($job, $this->actor);

        $this->assertSame(FieldJobStatus::InProgress, $started->status);
        $this->assertCount(1, $started->units);
    }

    public function test_start_with_open_warehouse_issuance_succeeds(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-WH-TOOLS-'.uniqid(),
            'name' => 'Warehouse Tools',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
            'stage_data' => [
                'site_measurement' => [
                    'lines' => [
                        [
                            'ref' => 'D01',
                            'unit_floor' => 'Ground',
                            'product_type' => 'Door',
                            'quantity' => 1,
                            'sort_order' => 0,
                        ],
                    ],
                ],
            ],
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-WH-TOOLS-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::Scheduled,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        $tool = Tool::query()->create([
            'tool_code' => 'TL-WH-'.uniqid(),
            'name' => 'Warehouse Drill',
            'tool_type' => 'power_tool',
            'is_returnable' => true,
            'condition' => ToolCondition::Good->value,
            'is_active' => true,
            'tracking_mode' => ToolTrackingMode::Serialized->value,
            'total_qty' => 1,
            'qty_in_repair' => 0,
        ]);

        ToolIssuance::query()->create([
            'tool_id' => $tool->id,
            'project_id' => $project->id,
            'issued_to' => $this->actor->id,
            'issued_by' => $this->actor->id,
            'quantity' => 1,
            'issue_date' => now()->toDateString(),
            'condition_out' => ToolCondition::Good->value,
            'created_at' => now(),
        ]);

        $started = app(FieldInstallationJobService::class)->start($job, $this->actor);

        $this->assertSame(FieldJobStatus::InProgress, $started->status);
    }

    public function test_complete_with_zero_units_fails(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-ZERO-'.uniqid(),
            'name' => 'Zero Units',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-ZERO-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::InProgress,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
            'actual_start' => now(),
            'percent_complete' => 0,
        ]);

        try {
            app(FieldInstallationJobService::class)->complete($job, $this->actor);
            $this->fail('Expected ValidationException when completing with zero units.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('units', $e->errors());
            $this->assertStringContainsString(
                'No measured openings to install',
                $e->errors()['units'][0],
            );
        }

        $this->assertSame(FieldJobStatus::InProgress, $job->fresh()->status);
    }

    public function test_complete_with_pending_units_fails(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-PEND-'.uniqid(),
            'name' => 'Pending Units',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
            'stage_data' => [
                'site_measurement' => [
                    'lines' => [
                        [
                            'ref' => 'D01',
                            'unit_floor' => 'Ground',
                            'product_type' => 'Door',
                            'quantity' => 1,
                            'sort_order' => 0,
                        ],
                    ],
                ],
            ],
        ]);

        $job = FieldInstallationJob::query()->create([
            'reference' => 'FI-PEND-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::InProgress,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
            'actual_start' => now(),
            'percent_complete' => 0,
        ]);

        FieldInstallationUnit::query()->create([
            'job_id' => $job->id,
            'unit_label' => 'Ground — D01',
            'opening_ref' => 'D01',
            'status' => FieldUnitStatus::Pending,
            'sort_order' => 0,
            'measurement_line_key' => 'line-0-D01',
        ]);

        try {
            app(FieldInstallationJobService::class)->complete($job, $this->actor);
            $this->fail('Expected ValidationException when completing with pending units.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('units', $e->errors());
            $this->assertStringContainsString(
                'All installation units must be installed or waived',
                $e->errors()['units'][0],
            );
        }

        $this->assertSame(FieldJobStatus::InProgress, $job->fresh()->status);
    }

    public function test_cannot_advance_installation_to_site_qc_without_completed_field_job(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-GATE-'.uniqid(),
            'name' => 'Install Gate',
            'stage' => ProjectStage::Installation,
            'type' => 'residential',
            'location_type' => 'nairobi',
            'install_mode' => InstallMode::NairobiSiteInstall,
        ]);

        FieldInstallationJob::query()->create([
            'reference' => 'FI-GATE-'.uniqid(),
            'project_id' => $project->id,
            'job_type' => FieldJobType::NairobiSiteInstall,
            'status' => FieldJobStatus::InProgress,
            'team_lead_id' => $this->actor->id,
            'created_by' => $this->actor->id,
        ]);

        try {
            app(ProjectStageService::class)->transition(
                $project,
                ProjectStage::SiteQc,
                $this->actor,
            );
            $this->fail('Expected ValidationException when advancing without completed field job.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('stage', $e->errors());
            $this->assertStringContainsString(
                'Field installation must be completed',
                $e->errors()['stage'][0],
            );
        }

        $this->assertSame(ProjectStage::Installation, $project->fresh()->stage);
    }

    public function test_outside_cannot_advance_in_transit_to_installation_without_delivered_dispatch(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-DELIV-'.uniqid(),
            'name' => 'Outside Delivery Gate',
            'stage' => ProjectStage::InTransit,
            'type' => 'residential',
            'location_type' => 'outside_nairobi',
            'install_mode' => InstallMode::OutsideFullInstall,
            'project_manager_id' => $this->actor->id,
        ]);

        $driver = Driver::query()->create([
            'code' => 'DRV-DELIV-'.uniqid(),
            'name' => 'Delivery Driver',
            'phone' => '0700000000',
            'vehicle_registration' => 'KAA 123A',
            'is_active' => true,
            'status' => DriverStatus::Occupied->value,
        ]);

        $dispatch = ProjectDispatch::query()->create([
            'project_id' => $project->id,
            'driver_id' => $driver->id,
            'created_by' => $this->actor->id,
            'status' => ProjectDispatchStatus::InTransit->value,
            'dispatched_at' => now(),
        ]);

        Sanctum::actingAs($this->actor);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::Installation->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['stage']);

        $this->assertSame(ProjectStage::InTransit, $project->fresh()->stage);

        $dispatch->update([
            'status' => ProjectDispatchStatus::Delivered->value,
            'delivered_at' => now(),
        ]);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::Installation->value,
        ])
            ->assertOk()
            ->assertJsonPath('data.stage', ProjectStage::Installation->value);
    }

    protected function assignToolToJob(FieldInstallationJob $job): FieldToolAssignment
    {
        $tool = Tool::query()->create([
            'tool_code' => 'TL-FI-'.uniqid(),
            'name' => 'Installation Drill',
            'tool_type' => 'power_tool',
            'is_returnable' => true,
            'condition' => ToolCondition::Good->value,
            'is_active' => true,
            'tracking_mode' => ToolTrackingMode::Serialized->value,
            'total_qty' => 1,
            'qty_in_repair' => 0,
        ]);

        $issuance = ToolIssuance::query()->create([
            'tool_id' => $tool->id,
            'project_id' => $job->project_id,
            'issued_to' => $this->actor->id,
            'issued_by' => $this->actor->id,
            'quantity' => 1,
            'issue_date' => now()->toDateString(),
            'condition_out' => ToolCondition::Good->value,
            'created_at' => now(),
        ]);

        return FieldToolAssignment::query()->create([
            'job_id' => $job->id,
            'tool_issuance_id' => $issuance->id,
            'assigned_by' => $this->actor->id,
            'created_at' => now(),
        ]);
    }
}
