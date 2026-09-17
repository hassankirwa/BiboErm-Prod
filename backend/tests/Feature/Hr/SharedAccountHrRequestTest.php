<?php

namespace Tests\Feature\Hr;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\HrRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SharedAccountHrRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_shared_account_requires_employee_number_and_hides_advance_amount(): void
    {
        $department = Department::query()->create([
            'name' => 'Warehouse',
            'slug' => 'warehouse',
            'shared_email' => 'warehouse@bibo.test',
            'is_active' => true,
        ]);

        $sharedUser = User::factory()->create([
            'email' => 'warehouse@bibo.test',
        ]);

        $employee = User::factory()->create([
            'email' => 'worker@bibo.test',
        ]);

        EmployeeProfile::query()->create([
            'user_id' => $employee->id,
            'employee_number' => 'BWD2001',
        ]);

        Sanctum::actingAs($sharedUser);

        $create = $this->postJson('/api/v1/my/hr-requests', [
            'type' => HrRequest::TYPE_SALARY_ADVANCE,
            'amount' => 5000,
            'notes' => 'Need advance',
            'employee_number' => 'BWD2001',
        ]);

        $create->assertCreated();
        $create->assertJsonPath('data.amount_hidden', true);
        $create->assertJsonPath('data.amount', null);
        $create->assertJsonPath('data.employee_number', 'BWD2001');
        $create->assertJsonPath('meta.is_shared_account', true);

        $list = $this->getJson('/api/v1/my/hr-requests');
        $list->assertOk();
        $list->assertJsonPath('meta.is_shared_account', true);
        $list->assertJsonPath('data.0.amount', null);
        $list->assertJsonPath('data.0.amount_hidden', true);
        $list->assertJsonPath('data.0.status', 'pending');

        $this->assertSame($department->id, $department->id);
    }

    public function test_shared_account_rejects_unknown_employee_number(): void
    {
        Department::query()->create([
            'name' => 'Warehouse',
            'slug' => 'warehouse-2',
            'shared_email' => 'shared-wh@bibo.test',
            'is_active' => true,
        ]);

        $sharedUser = User::factory()->create([
            'email' => 'shared-wh@bibo.test',
        ]);

        Sanctum::actingAs($sharedUser);

        $this->postJson('/api/v1/my/hr-requests', [
            'type' => HrRequest::TYPE_DOCUMENT,
            'employee_number' => 'MISSING',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['employee_number']);
    }
}
