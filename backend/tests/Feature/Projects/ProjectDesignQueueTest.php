<?php

namespace Tests\Feature\Projects;

use App\Enums\ProjectStage;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Project;
use App\Models\SiteVisit;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProjectDesignQueueTest extends TestCase
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
            CrmLookupSeeder::class,
        ]);

        $this->user = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->user->assignRole('project_manager');
    }

    public function test_design_queue_lists_active_projects_in_design_stages(): void
    {
        $contact = Contact::query()->create([
            'first_name' => 'Design',
            'last_name' => 'Client',
            'name' => 'Design Client',
            'phone' => '+254700000099',
            'status' => 'active',
        ]);

        $account = Account::query()->create([
            'account_number' => 'ACC-DESIGN-001',
            'name' => 'Design Client Residence',
            'status' => 'active_opportunity',
            'primary_contact_id' => $contact->id,
            'owner_id' => $this->user->id,
            'account_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $inQueue = Project::query()->create([
            'reference' => 'PR-DESIGN-001',
            'name' => 'Beatrice Windows',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'stage' => ProjectStage::DepositReceived->value,
            'is_active' => true,
            'quoted_amount' => 450000,
            'deposit_received' => 225000,
            'project_manager_id' => $this->user->id,
        ]);

        SiteVisit::query()->create([
            'visit_number' => 'SV-DESIGN-001',
            'title' => 'Production measurement',
            'project_id' => $inQueue->id,
            'assigned_field_officer_id' => $this->user->id,
            'assigned_to_user_id' => $this->user->id,
            'scheduled_by' => $this->user->id,
            'visit_date' => now()->toDateString(),
            'measurement_context' => 'production',
            'status' => 'submitted_for_review',
            'measurement_form_status' => 'submitted',
        ]);

        Project::query()->create([
            'reference' => 'PR-DESIGN-002',
            'name' => 'Awaiting Deposit Project',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'stage' => ProjectStage::AwaitingDeposit->value,
            'is_active' => false,
            'project_manager_id' => $this->user->id,
        ]);

        Project::query()->create([
            'reference' => 'PR-DESIGN-003',
            'name' => 'Fabrication Project',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'stage' => ProjectStage::FabricationStage->value,
            'is_active' => true,
            'project_manager_id' => $this->user->id,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/v1/projects/design/queue');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $inQueue->id)
            ->assertJsonPath('data.0.stage', ProjectStage::DepositReceived->value)
            ->assertJsonPath('data.0.stage_label', 'Awaiting design')
            ->assertJsonPath('data.0.has_production_measurement', false)
            ->assertJsonPath('data.0.measurement_status', 'submitted_for_review')
            ->assertJsonPath('data.0.measurement_status_label', 'Pending approval')
            ->assertJsonPath('data.0.has_design_document', false)
            ->assertJsonPath('data.0.account.name', 'Design Client Residence');
    }
}
