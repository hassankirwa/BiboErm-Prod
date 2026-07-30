<?php

namespace Tests\Feature\Projects;

use App\Enums\ProjectStage;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Project;
use App\Models\ProjectDocument;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectFabricationImportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Project $project;

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

        $contact = Contact::query()->create([
            'first_name' => 'Beatrice',
            'last_name' => 'Client',
            'name' => 'Beatrice Client',
            'phone' => '+254700000088',
            'status' => 'active',
        ]);

        $account = Account::query()->create([
            'account_number' => 'ACC-FAB-001',
            'name' => 'Beatrice Residence',
            'status' => 'active_opportunity',
            'primary_contact_id' => $contact->id,
            'owner_id' => $this->user->id,
            'account_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $this->project = Project::query()->create([
            'reference' => 'PR-FAB-001',
            'name' => 'Beatrice Windows',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'stage' => ProjectStage::FinalDesignApproval->value,
            'is_active' => true,
            'project_manager_id' => $this->user->id,
        ]);
    }

    public function test_fabrication_list_import_persists_designs_and_descriptions(): void
    {
        $path = base_path('../docs/BEATRICE FABRICATION LIST.xls');
        $this->assertFileExists($path);

        Sanctum::actingAs($this->user);

        $response = $this->post(
            "/api/v1/projects/{$this->project->id}/designs/fabrication",
            [
                'file' => new UploadedFile($path, 'BEATRICE FABRICATION LIST.xls', null, null, true),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertCreated();
        $response->assertJsonPath('data.summary.designs_saved', fn ($value) => (int) $value >= 1);

        $this->assertDatabaseHas('project_documents', [
            'project_id' => $this->project->id,
            'type' => 'fabrication',
        ]);

        $designs = ProjectDocument::query()
            ->where('project_id', $this->project->id)
            ->where('type', 'design')
            ->get();

        $this->assertGreaterThanOrEqual(4, $designs->count());
        $this->assertTrue(
            $designs->contains(fn (ProjectDocument $doc) => ($doc->metadata['source'] ?? null) === 'fabrication')
        );
        $this->assertTrue(
            $designs->contains(fn (ProjectDocument $doc) => filled($doc->metadata['description'] ?? null))
        );
        $this->assertTrue(
            $designs->contains(fn (ProjectDocument $doc) => filled($doc->metadata['code'] ?? null))
        );

        $withImages = $designs->filter(
            fn (ProjectDocument $doc) => ($doc->metadata['has_elevation_image'] ?? false) === true
        );
        $this->assertSame(
            4,
            $withImages->count(),
            'Expected elevation images for all four Beatrice openings (SD-1..SD-4).'
        );
        $codes = $designs->pluck('metadata.code')->filter()->values()->all();
        sort($codes);
        $this->assertSame(['SD-1', 'SD-2', 'SD-3', 'SD-4'], $codes);
    }

    public function test_reupload_syncs_by_code_and_preserves_bom_tags(): void
    {
        $path = base_path('../docs/BEATRICE FABRICATION LIST.xls');
        $this->assertFileExists($path);

        Sanctum::actingAs($this->user);

        $first = $this->post(
            "/api/v1/projects/{$this->project->id}/designs/fabrication",
            [
                'file' => new UploadedFile($path, 'BEATRICE FABRICATION LIST.xls', null, null, true),
            ],
            ['Accept' => 'application/json']
        );
        $first->assertCreated();

        $sd1 = ProjectDocument::query()
            ->where('project_id', $this->project->id)
            ->where('type', 'design')
            ->where('metadata->code', 'SD-1')
            ->firstOrFail();

        $sd1Id = $sd1->id;
        $sd1->update([
            'metadata' => array_merge($sd1->metadata ?? [], [
                'bom_tags' => [
                    'bom_id' => 99,
                    'bom_line_ids' => [11, 22],
                    'tagged_at' => now()->toIso8601String(),
                    'tagged_by' => $this->user->id,
                ],
            ]),
        ]);

        $second = $this->post(
            "/api/v1/projects/{$this->project->id}/designs/fabrication",
            [
                'file' => new UploadedFile($path, 'BEATRICE FABRICATION LIST.xls', null, null, true),
            ],
            ['Accept' => 'application/json']
        );
        $second->assertCreated();
        $second->assertJsonPath('data.summary.created', 0);
        $second->assertJsonPath('data.summary.removed', 0);
        $this->assertSame(
            4,
            (int) $second->json('data.summary.updated') + (int) $second->json('data.summary.unchanged')
        );

        $this->assertSame(
            4,
            ProjectDocument::query()
                ->where('project_id', $this->project->id)
                ->where('type', 'design')
                ->where('metadata->source', 'fabrication')
                ->count()
        );

        $this->assertSame(
            1,
            ProjectDocument::query()
                ->where('project_id', $this->project->id)
                ->where('type', 'fabrication')
                ->count()
        );

        $sd1After = ProjectDocument::query()->findOrFail($sd1Id);
        $this->assertSame('SD-1', $sd1After->metadata['code'] ?? null);
        $this->assertSame([11, 22], $sd1After->metadata['bom_tags']['bom_line_ids'] ?? null);
    }
}
