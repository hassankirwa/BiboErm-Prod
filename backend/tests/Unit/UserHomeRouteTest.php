<?php

namespace Tests\Unit;

use App\Services\Roles\SyncDepartmentRolesToSpatie;
use App\Support\UserHomeRoute;
use Tests\Feature\FeatureTestCase;
use Tests\Support\InteractsWithSeededApplication;

class UserHomeRouteTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    private function userWithSyncedRole(string $departmentSlug, string $roleName)
    {
        $user = $this->userWithDepartmentRole($departmentSlug, $roleName);
        app(SyncDepartmentRolesToSpatie::class)->sync($user);

        return $user->fresh();
    }

    public function test_installation_lead_lands_on_field_module(): void
    {
        $user = $this->userWithSyncedRole('field_installation', 'installation_lead');

        $this->assertSame('/field', UserHomeRoute::forUser($user));
    }

    public function test_field_officer_lands_on_field_module(): void
    {
        $user = $this->userWithSyncedRole('field', 'field_officer');

        $this->assertSame('/field', UserHomeRoute::forUser($user));
    }

    public function test_sales_representative_lands_on_crm(): void
    {
        $user = $this->userWithSyncedRole('sales_marketing', 'sales_representative');

        $this->assertSame('/crm', UserHomeRoute::forUser($user));
    }

    public function test_quotation_officer_lands_on_quotation_module(): void
    {
        $user = $this->userWithSyncedRole('quotation', 'quotation_officer');

        $this->assertSame('/quotation/proforma', UserHomeRoute::forUser($user));
    }

    public function test_it_admin_lands_on_workspace(): void
    {
        $user = $this->userWithSyncedRole('it', 'it_admin');

        $this->assertSame('/workspace', UserHomeRoute::forUser($user));
    }

    public function test_field_installation_department_without_field_role_still_lands_on_field(): void
    {
        $user = $this->userWithSyncedRole(
            'field_installation',
            'field_installation_engineer',
        );

        $this->assertSame('/field', UserHomeRoute::forUser($user));
    }
}
