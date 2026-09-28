<?php

namespace Tests\Feature\Projects;

use App\Enums\Projects\ProjectScopeType;
use App\Enums\Projects\ProjectWaveStatus;
use App\Models\Project;
use App\Models\ProjectScope;
use App\Models\ProjectWave;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectWaveBootstrapTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        foreach (['projects.view', 'projects.manage', 'projects.view_all'] as $permission) {
            Permission::findOrCreate($permission);
        }

        $this->user = User::factory()->create();
        $this->user->givePermissionTo(['projects.view', 'projects.manage', 'projects.view_all']);
    }

    public function test_bootstrap_creates_wave_floors_and_rooms_from_measurements(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-WAVE-'.uniqid(),
            'name' => 'Wave Test Project',
            'stage' => 'materials_ready',
            'type' => 'residential',
            'location_type' => 'nairobi',
            'stage_data' => [
                'site_measurement' => [
                    'form' => [
                        'lines' => [
                            [
                                'ref' => 'W1',
                                'unit_floor' => 'Ground',
                                'room_location' => 'Living',
                                'product_type' => 'Sliding',
                                'quantity' => 1,
                                'width_centre_mm' => 1200,
                                'height_centre_mm' => 2100,
                            ],
                            [
                                'ref' => 'W2',
                                'unit_floor' => 'Ground',
                                'room_location' => 'Kitchen',
                                'product_type' => 'Casement',
                                'quantity' => 1,
                                'width_centre_mm' => 900,
                                'height_centre_mm' => 1500,
                            ],
                            [
                                'ref' => 'W3',
                                'unit_floor' => 'First',
                                'room_location' => 'Bedroom',
                                'product_type' => 'Sliding',
                                'quantity' => 2,
                                'width_centre_mm' => 1400,
                                'height_centre_mm' => 2100,
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/waves/bootstrap-from-measurements")
            ->assertOk()
            ->assertJsonPath('data.wave.wave_number', 1)
            ->assertJsonPath('data.scopes_created', 5);

        $this->assertSame(1, ProjectWave::query()->where('project_id', $project->id)->count());
        $this->assertSame(2, ProjectScope::query()
            ->where('project_id', $project->id)
            ->where('type', ProjectScopeType::Floor->value)
            ->count());
        $this->assertSame(3, ProjectScope::query()
            ->where('project_id', $project->id)
            ->where('type', ProjectScopeType::Room->value)
            ->count());

        $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/v1/projects/{$project->id}/waves")
            ->assertOk()
            ->assertJsonPath('data.waves.0.status', ProjectWaveStatus::Planned->value)
            ->assertJsonCount(2, 'data.floors');
    }

    public function test_second_wave_can_receive_remaining_scopes(): void
    {
        $project = Project::query()->create([
            'reference' => 'PRJ-WAVE2-'.uniqid(),
            'name' => 'Wave 2 Project',
            'stage' => 'materials_ready',
            'type' => 'residential',
            'location_type' => 'nairobi',
            'stage_data' => [
                'site_measurement' => [
                    'form' => [
                        'lines' => [
                            [
                                'ref' => 'A1',
                                'unit_floor' => 'Ground',
                                'room_location' => 'Hall',
                                'product_type' => 'Door',
                                'quantity' => 1,
                                'width_centre_mm' => 900,
                                'height_centre_mm' => 2100,
                            ],
                            [
                                'ref' => 'A2',
                                'unit_floor' => 'Second',
                                'room_location' => 'Office',
                                'product_type' => 'Window',
                                'quantity' => 1,
                                'width_centre_mm' => 800,
                                'height_centre_mm' => 1200,
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/waves/bootstrap-from-measurements")
            ->assertOk();

        $secondFloor = ProjectScope::query()
            ->where('project_id', $project->id)
            ->where('type', ProjectScopeType::Floor->value)
            ->where('label', 'Second')
            ->firstOrFail();

        $wave2 = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/waves", [
                'label' => 'Upper floors',
                'scope_ids' => [$secondFloor->id],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame(2, $wave2['wave_number']);
        $this->assertSame($wave2['id'], $secondFloor->fresh()->project_wave_id);
    }
}
