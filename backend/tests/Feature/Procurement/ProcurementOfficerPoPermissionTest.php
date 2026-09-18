<?php

namespace Tests\Feature\Procurement;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\InteractsWithSeededApplication;
use Tests\TestCase;

class ProcurementOfficerPoPermissionTest extends TestCase
{
    use RefreshDatabase;
    use InteractsWithSeededApplication;

    public function test_procurement_officer_with_manage_can_hit_create_po_route(): void
    {
        $this->seedApplication();

        $user = $this->userWithDepartmentRole('procurement', 'procurement_officer');

        $this->assertTrue($user->can('procurement.manage'));
        $this->assertTrue($user->can('procurement.po.create'));

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', []);

        $this->assertNotEquals(
            403,
            $response->status(),
            'Expected middleware to allow procurement officer. Got: '.$response->getContent()
        );
    }
}
