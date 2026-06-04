<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Spatie\Permission\Models\Role;
use Tests\Support\InteractsWithSeededApplication;

class HrEmployeeManagementTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_hr_upsert_forbidden_without_permission(): void
    {
        $guard = (string) config('permission.defaults.guard', 'web');

        $sales = $this->userWithDepartmentRole('sales_marketing', 'sales_representative');

        /** @var User $target */
        $target = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        UserDepartmentRole::query()->create([
            'user_id' => $target->id,
            'department_id' => $sales->departmentRoles()->first()->department_id,
            'role_id' => Role::findByName('sales_representative', $guard)->id,
            'is_primary' => true,
            'assigned_by' => $sales->id,
            'assigned_at' => now(),
        ]);

        $this->actingAsSanctum($sales);

        $this->putJson('/api/hr/employees/'.$target->id, [
            'job_title' => 'Technician',
        ])->assertForbidden();
    }

    public function test_hr_manager_can_patch_employee_records(): void
    {
        $guard = (string) config('permission.defaults.guard', 'web');

        $hr = $this->userWithDepartmentRole('hr', 'hr_manager');

        /** @var User $target */
        $target = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        UserDepartmentRole::query()->create([
            'user_id' => $target->id,
            'department_id' => Department::firstOrFail()->id,
            'role_id' => Role::query()->where('guard_name', $guard)->firstOrFail()->id,
            'is_primary' => true,
            'assigned_by' => $hr->id,
            'assigned_at' => now(),
        ]);

        $this->actingAsSanctum($hr);

        $this->putJson('/api/hr/employees/'.$target->id, [
            'job_title' => 'HR Specialist',
            'employee_number' => 'EMP98765',
            'employment_type' => 'full_time',
        ])->assertOk()
            ->assertJsonFragment(['message' => __('HR record saved.')]);

        $this->assertSame('EMP98765', EmployeeProfile::query()->where('user_id', $target->id)->value('employee_number'));
    }

    public function test_hr_manager_can_approve_pending_users(): void
    {
        $hr = $this->userWithDepartmentRole('hr', 'hr_manager');
        $guard = (string) config('permission.defaults.guard', 'web');
        /** @var User $supervisor */
        $supervisor = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        UserDepartmentRole::query()->create([
            'user_id' => $supervisor->id,
            'department_id' => Department::firstOrFail()->id,
            'role_id' => Role::findByName('operations_manager', $guard)->id,
            'is_primary' => true,
            'assigned_by' => $hr->id,
            'assigned_at' => now(),
        ]);

        /** @var User $employee */
        $employee = User::factory()->create(['status' => User::STATUS_PENDING_HR_REVIEW]);

        UserDepartmentRole::query()->create([
            'user_id' => $employee->id,
            'department_id' => Department::first()->id,
            'role_id' => Role::query()->where('guard_name', $guard)->firstOrFail()->id,
            'is_primary' => true,
            'assigned_by' => $hr->id,
            'assigned_at' => now(),
        ]);

        EmployeeProfile::query()->create([
            'user_id' => $employee->id,
            'employee_number' => 'EMP111',
            'job_title' => 'Analyst',
            'employment_type' => 'full_time',
            'reporting_manager_id' => $supervisor->id,
            'start_date' => now()->toDateString(),
        ]);

        $this->actingAsSanctum($hr);

        $this->postJson('/api/hr/employees/'.$employee->id.'/approve')
            ->assertOk()
            ->assertJsonFragment(['message' => __('Account approved.')]);

        $this->assertSame(User::STATUS_ACTIVE, $employee->fresh()->status);
    }

    public function test_hr_approve_rejects_non_pending_candidates(): void
    {
        $hr = $this->userWithDepartmentRole('hr', 'hr_manager');
        $guard = (string) config('permission.defaults.guard', 'web');
        /** @var User $active */
        $active = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        UserDepartmentRole::query()->create([
            'user_id' => $active->id,
            'department_id' => Department::first()->id,
            'role_id' => Role::query()->where('guard_name', $guard)->firstOrFail()->id,
            'is_primary' => true,
            'assigned_by' => $hr->id,
            'assigned_at' => now(),
        ]);

        $this->actingAsSanctum($hr);

        $this->postJson('/api/hr/employees/'.$active->id.'/approve')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['user']);
    }
}
