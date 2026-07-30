<?php

namespace Tests\Feature\Projects;

use App\Enums\Procurement\DriverStatus;
use App\Enums\ProjectStage;
use App\Enums\Projects\ProjectDispatchStatus;
use App\Models\Procurement\Driver;
use App\Models\Project;
use App\Models\Projects\ProjectDispatch;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectDispatchDriverOccupancyTest extends TestCase
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
        $this->user->givePermissionTo([
            'projects.view',
            'projects.view_all',
            'projects.advance_stage',
            'projects.manage',
        ]);
    }

    public function test_advance_to_in_transit_requires_driver_and_occupies_them(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::QcPreInstallation->value]);
        $driver = $this->makeDriver('DRV-PD-1');

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::InTransit->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['driver_id']);

        $this->postJson("/api/v1/projects/{$project->id}/advance-stage", [
            'stage' => ProjectStage::InTransit->value,
            'driver_id' => $driver->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.stage', ProjectStage::InTransit->value);

        $this->assertSame(DriverStatus::Occupied, $driver->fresh()->status);
        $this->assertDatabaseHas('project_dispatches', [
            'project_id' => $project->id,
            'driver_id' => $driver->id,
            'status' => ProjectDispatchStatus::InTransit->value,
        ]);
    }

    public function test_mark_delivered_and_advance_to_installation_release_driver(): void
    {
        $project = $this->makeProject(['stage' => ProjectStage::QcPreInstallation->value]);
        $driver = $this->makeDriver('DRV-PD-2');

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$project->id}/dispatch", [
            'driver_id' => $driver->id,
            'packing_notes' => 'Handle with care',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', ProjectDispatchStatus::InTransit->value);

        $this->assertSame(DriverStatus::Occupied, $driver->fresh()->status);
        $this->assertSame(ProjectStage::InTransit, $project->fresh()->stage);

        $dispatch = ProjectDispatch::query()->where('project_id', $project->id)->firstOrFail();

        $this->postJson("/api/v1/projects/project-dispatches/{$dispatch->id}/delivered")
            ->assertOk()
            ->assertJsonPath('data.status', ProjectDispatchStatus::Delivered->value);

        $this->assertSame(DriverStatus::Available, $driver->fresh()->status);

        // Occupy again via a fresh dispatch path for installation release coverage.
        $driverB = $this->makeDriver('DRV-PD-3');
        $projectB = $this->makeProject(['stage' => ProjectStage::QcPreInstallation->value]);

        $this->postJson("/api/v1/projects/{$projectB->id}/advance-stage", [
            'stage' => ProjectStage::InTransit->value,
            'driver_id' => $driverB->id,
        ])->assertOk();

        $this->assertSame(DriverStatus::Occupied, $driverB->fresh()->status);

        $this->postJson("/api/v1/projects/{$projectB->id}/advance-stage", [
            'stage' => ProjectStage::Installation->value,
        ])->assertOk();

        $this->assertSame(DriverStatus::Available, $driverB->fresh()->status);
        $this->assertDatabaseHas('project_dispatches', [
            'project_id' => $projectB->id,
            'driver_id' => $driverB->id,
            'status' => ProjectDispatchStatus::Delivered->value,
        ]);
    }

    public function test_cannot_dispatch_occupied_driver(): void
    {
        $projectA = $this->makeProject(['stage' => ProjectStage::QcPreInstallation->value]);
        $projectB = $this->makeProject(['stage' => ProjectStage::QcPreInstallation->value]);
        $driver = $this->makeDriver('DRV-PD-4');

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/projects/{$projectA->id}/dispatch", [
            'driver_id' => $driver->id,
        ])->assertCreated();

        $this->postJson("/api/v1/projects/{$projectB->id}/dispatch", [
            'driver_id' => $driver->id,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['driver_id']);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function makeProject(array $attributes = []): Project
    {
        return Project::query()->create(array_merge([
            'reference' => 'PR-'.Str::upper(Str::random(8)),
            'name' => 'Dispatch Test Project',
            'type' => 'residential',
            'location_type' => 'nairobi',
            'stage' => ProjectStage::QcPreInstallation->value,
            'is_active' => true,
            'completion_percent' => 70,
            'priority' => 'normal',
            'project_manager_id' => $this->user->id,
        ], $attributes));
    }

    protected function makeDriver(string $code): Driver
    {
        return Driver::query()->create([
            'code' => $code,
            'name' => "Driver {$code}",
            'phone' => '0711111111',
            'vehicle_registration' => 'KBB '.$code,
            'is_active' => true,
            'status' => DriverStatus::Available->value,
        ]);
    }
}
