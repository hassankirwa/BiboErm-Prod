<?php

namespace Tests\Feature\Projects;

use App\Enums\ProjectStage;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Project;
use App\Models\ProjectBom;
use App\Models\ProjectBomLine;
use App\Models\ProjectDocument;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectDocumentBomTagTest extends TestCase
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
            'first_name' => 'Tag',
            'last_name' => 'Client',
            'name' => 'Tag Client',
            'phone' => '+254700000099',
            'status' => 'active',
        ]);

        $account = Account::query()->create([
            'account_number' => 'ACC-TAG-001',
            'name' => 'Tag Residence',
            'status' => 'active_opportunity',
            'primary_contact_id' => $contact->id,
            'owner_id' => $this->user->id,
            'account_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $this->project = Project::query()->create([
            'reference' => 'PR-TAG-001',
            'name' => 'Tag Windows',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'stage' => ProjectStage::FinalDesignApproval->value,
            'is_active' => true,
            'project_manager_id' => $this->user->id,
        ]);
    }

    public function test_can_tag_fabrication_opening_with_bom_lines(): void
    {
        $document = ProjectDocument::query()->create([
            'project_id' => $this->project->id,
            'type' => 'design',
            'filename' => 'SD-1.jpg',
            'path' => 'project-documents/project-'.$this->project->id.'/SD-1.jpg',
            'version' => 1,
            'uploaded_by' => $this->user->id,
            'metadata' => [
                'source' => 'fabrication',
                'code' => 'SD-1',
                'series' => 'S90 Sliding',
                'quantity' => 1,
                'colour' => '深灰色',
            ],
        ]);

        $bom = ProjectBom::query()->create([
            'project_id' => $this->project->id,
            'version' => 1,
            'status' => 'draft',
            'uploaded_by' => $this->user->id,
        ]);

        $lineA = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'aluminium_profile',
            'material_code' => 'PY08',
            'material_name' => 'Side frame',
            'quantity' => 2,
            'measurement_mm' => 2090,
            'sort_order' => 1,
            'notes' => 'SD-1 S90 | Frame profile',
        ]);

        $lineB = ProjectBomLine::query()->create([
            'bom_id' => $bom->id,
            'line_type' => 'glass',
            'material_code' => null,
            'material_name' => 'Reflective glass',
            'quantity' => 1,
            'measurement_mm' => 1961,
            'sort_order' => 2,
            'notes' => 'SD-1 glass',
            'is_glass' => true,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->patchJson(
            "/api/v1/projects/{$this->project->id}/documents/{$document->id}",
            ['bom_line_ids' => [$lineA->id, $lineB->id]]
        );

        $response->assertOk();
        $response->assertJsonPath('data.metadata.bom_tags.bom_id', $bom->id);
        $response->assertJsonPath('data.metadata.bom_tags.bom_line_ids', [$lineA->id, $lineB->id]);
        $response->assertJsonPath('data.metadata.code', 'SD-1');

        $document->refresh();
        $this->assertSame([$lineA->id, $lineB->id], $document->metadata['bom_tags']['bom_line_ids']);
    }
}
