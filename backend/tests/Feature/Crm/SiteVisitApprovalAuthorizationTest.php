<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\SiteVisitStatus;
use App\Models\Lead;
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

class SiteVisitApprovalAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $leadOwner;

    protected User $scheduler;

    protected User $otherSalesRep;

    protected User $superAdmin;

    protected SiteVisit $visit;

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

        $this->leadOwner = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->leadOwner->assignRole('sales_representative');

        $this->scheduler = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->scheduler->assignRole('sales_representative');

        $this->otherSalesRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->otherSalesRep->assignRole('sales_representative');

        $this->superAdmin = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->superAdmin->assignRole('super_admin');

        $lead = Lead::query()->create([
            'reference' => 'LD-APPROVE-001',
            'lead_number' => 'LD-APPROVE-001',
            'name' => 'Approval Auth Lead',
            'first_name' => 'Approval',
            'lead_owner_id' => $this->leadOwner->id,
            'created_by' => $this->leadOwner->id,
        ]);

        $this->visit = SiteVisit::query()->create([
            'visit_number' => 'SV-APPROVE-001',
            'title' => 'Approval auth visit',
            'lead_id' => $lead->id,
            'assigned_field_officer_id' => $this->leadOwner->id,
            'scheduled_by' => $this->scheduler->id,
            'visit_date' => now()->toDateString(),
            'status' => SiteVisitStatus::SubmittedForReview->value,
        ]);
    }

    public function test_lead_owner_can_approve_submitted_visit(): void
    {
        Sanctum::actingAs($this->leadOwner);

        $this->postJson("/api/v1/crm/site-visits/{$this->visit->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::Approved->value);
    }

    public function test_scheduler_can_approve_submitted_visit(): void
    {
        Sanctum::actingAs($this->scheduler);

        $this->postJson("/api/v1/crm/site-visits/{$this->visit->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::Approved->value);
    }

    public function test_super_admin_can_approve_submitted_visit(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $this->postJson("/api/v1/crm/site-visits/{$this->visit->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', SiteVisitStatus::Approved->value);
    }

    public function test_unrelated_user_with_approve_permission_cannot_approve(): void
    {
        Sanctum::actingAs($this->otherSalesRep);

        $this->postJson("/api/v1/crm/site-visits/{$this->visit->id}/approve")
            ->assertForbidden();
    }
}
