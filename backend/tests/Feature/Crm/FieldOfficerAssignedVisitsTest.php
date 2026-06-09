<?php

namespace Tests\Feature\Crm;

use App\Enums\Crm\SiteVisitStatus;
use App\Models\Account;
use App\Models\Deal;
use App\Models\MeasurementLine;
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

class FieldOfficerAssignedVisitsTest extends TestCase
{
    use RefreshDatabase;

    protected User $salesRep;

    protected User $fieldOfficer;

    protected User $otherFieldOfficer;

    protected Account $account;

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

        $this->salesRep = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->salesRep->assignRole('sales_representative');

        $this->fieldOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->fieldOfficer->assignRole('field_officer');

        $this->otherFieldOfficer = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        $this->otherFieldOfficer->assignRole('field_officer');

        $this->account = Account::query()->create([
            'name' => 'Westlands Towers',
            'status' => 'active',
            'created_by' => $this->salesRep->id,
        ]);
    }

    public function test_deal_create_persists_assigned_field_officer(): void
    {
        Sanctum::actingAs($this->salesRep);

        $response = $this->postJson('/api/v1/crm/deals', [
            'name' => 'Penthouse blinds package',
            'account_id' => $this->account->id,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'site_address' => 'Westlands, Nairobi',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.assigned_field_officer_id', $this->fieldOfficer->id);

        $this->assertDatabaseHas('deals', [
            'name' => 'Penthouse blinds package',
            'assigned_field_officer_id' => $this->fieldOfficer->id,
        ]);
    }

    public function test_open_assigned_visits_lists_only_current_officer_deal_visits(): void
    {
        $deal = Deal::query()->create([
            'reference' => 'DL-OPEN-001',
            'deal_number' => 'DL-OPEN-001',
            'title' => 'Deal with open visit',
            'name' => 'Deal with open visit',
            'account_id' => $this->account->id,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'deal_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
            'status' => 'open',
            'stage' => 'site_visit_pending',
        ]);

        $openVisit = SiteVisit::query()->create([
            'visit_number' => 'SV-OPEN-001',
            'title' => 'Westlands measurement',
            'deal_id' => $deal->id,
            'account_id' => $this->account->id,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->addDay()->toDateString(),
            'status' => SiteVisitStatus::Scheduled->value,
        ]);

        SiteVisit::query()->create([
            'visit_number' => 'SV-OPEN-002',
            'title' => 'Completed visit',
            'deal_id' => $deal->id,
            'account_id' => $this->account->id,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->subDay()->toDateString(),
            'status' => SiteVisitStatus::Approved->value,
        ]);

        SiteVisit::query()->create([
            'visit_number' => 'SV-OPEN-003',
            'title' => 'Other officer visit',
            'deal_id' => $deal->id,
            'account_id' => $this->account->id,
            'assigned_field_officer_id' => $this->otherFieldOfficer->id,
            'scheduled_by' => $this->salesRep->id,
            'visit_date' => now()->addDay()->toDateString(),
            'status' => SiteVisitStatus::Scheduled->value,
        ]);

        MeasurementLine::query()->create([
            'site_visit_id' => $openVisit->id,
            'room_area_name' => 'Living room',
            'width' => 2.5,
            'height' => 3,
            'quantity' => 2,
            'material_preference' => 'Venetian blinds',
            'sort_order' => 0,
        ]);

        Sanctum::actingAs($this->fieldOfficer);

        $response = $this->getJson('/api/v1/crm/site-visits/open');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $openVisit->id)
            ->assertJsonPath('data.0.deal.id', $deal->id)
            ->assertJsonPath('data.0.deal.assigned_field_officer_id', $this->fieldOfficer->id)
            ->assertJsonPath('data.0.assigned_field_officer.id', $this->fieldOfficer->id)
            ->assertJsonPath('data.0.measurement_lines.0.room_area_name', 'Living room')
            ->assertJsonPath('data.0.measurement_lines.0.material_preference', 'Venetian blinds');
    }

    public function test_field_officer_can_view_deal_assigned_to_them(): void
    {
        $deal = Deal::query()->create([
            'reference' => 'DL-VIEW-001',
            'deal_number' => 'DL-VIEW-001',
            'title' => 'Assigned deal',
            'name' => 'Assigned deal',
            'account_id' => $this->account->id,
            'assigned_field_officer_id' => $this->fieldOfficer->id,
            'deal_owner_id' => $this->salesRep->id,
            'owner_id' => $this->salesRep->id,
            'created_by' => $this->salesRep->id,
            'status' => 'open',
            'stage' => 'site_visit_pending',
        ]);

        Sanctum::actingAs($this->fieldOfficer);

        $this->getJson("/api/v1/crm/deals/{$deal->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $deal->id);
    }
}
