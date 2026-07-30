<?php

namespace Tests\Feature\Projects;

use App\Enums\Crm\SiteVisitStatus;
use App\Enums\ProjectStage;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Project;
use App\Models\User;
use Database\Seeders\CrmLookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ScheduleProjectMeasurementVisitTest extends TestCase
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

    public function test_schedule_resolves_site_address_from_account_when_project_has_none(): void
    {
        $contact = Contact::query()->create([
            'first_name' => 'Site',
            'last_name' => 'Client',
            'name' => 'Site Client',
            'phone' => '+254700000099',
            'status' => 'active',
        ]);

        $account = Account::query()->create([
            'account_number' => 'ACC-SITE-001',
            'name' => 'Site Client Residence',
            'status' => 'active_opportunity',
            'primary_contact_id' => $contact->id,
            'physical_address' => '123 Production Road, Nairobi',
            'owner_id' => $this->user->id,
            'account_owner_id' => $this->user->id,
            'created_by' => $this->user->id,
        ]);

        $project = Project::query()->create([
            'reference' => 'PR-SITE-001',
            'name' => 'Production Windows',
            'account_id' => $account->id,
            'contact_id' => $contact->id,
            'stage' => ProjectStage::DepositReceived->value,
            'is_active' => true,
            'project_manager_id' => $this->user->id,
        ]);

        $assignee = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $assignee->assignRole('field_officer');

        Sanctum::actingAs($this->user);

        $response = $this->postJson("/api/v1/projects/{$project->id}/measurement-visits", [
            'assigned_field_officer_id' => $assignee->id,
            'visit_date' => now()->toDateString(),
            'site_address' => '123 Production Road, Nairobi',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.site_address', '123 Production Road, Nairobi')
            ->assertJsonPath('data.status', SiteVisitStatus::Scheduled->value);

        $this->assertDatabaseHas('site_visits', [
            'project_id' => $project->id,
            'site_address' => '123 Production Road, Nairobi',
            'measurement_context' => 'production',
        ]);
    }

    public function test_schedule_allows_any_active_user_as_assignee(): void
    {
        $project = Project::query()->create([
            'reference' => 'PR-SITE-002',
            'name' => 'Any Assignee Windows',
            'stage' => ProjectStage::SiteAssessment->value,
            'is_active' => true,
            'project_manager_id' => $this->user->id,
        ]);

        $assignee = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $assignee->assignRole('warehouse_manager_aluminium');

        Sanctum::actingAs($this->user);

        $response = $this->postJson("/api/v1/projects/{$project->id}/measurement-visits", [
            'assigned_field_officer_id' => $assignee->id,
            'visit_date' => now()->toDateString(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.assigned_field_officer_id', $assignee->id);
    }
}
