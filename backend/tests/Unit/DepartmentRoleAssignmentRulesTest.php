<?php

namespace Tests\Unit;

use App\Models\Department;
use App\Support\DepartmentRoleAssignmentRules;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DepartmentRoleAssignmentRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            RoleSeeder::class,
            DepartmentSeeder::class,
        ]);
    }

    public function test_validate_passes_when_ids_exist(): void
    {
        $departmentId = Department::query()->where('slug', 'warehouse')->value('id');
        $roleId = Role::findByName('warehouse_manager_accessories', (string) config('permission.defaults.guard', 'web'))->id;

        DepartmentRoleAssignmentRules::validate($departmentId, $roleId, []);

        $this->assertTrue(true);
    }

    public function test_validate_requires_additional_assignment_fields(): void
    {
        $departmentId = Department::query()->where('slug', 'warehouse')->value('id');
        $roleId = Role::findByName('warehouse_manager_accessories', (string) config('permission.defaults.guard', 'web'))->id;

        try {
            DepartmentRoleAssignmentRules::validate($departmentId, $roleId, [['department_id' => $departmentId]]);
            $this->fail('Expected ValidationException');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('additional_assignments.0', $exception->errors());
        }
    }

    public function test_validate_rejects_unknown_department(): void
    {
        $roleId = Role::findByName('warehouse_manager_accessories', (string) config('permission.defaults.guard', 'web'))->id;

        try {
            DepartmentRoleAssignmentRules::validate(91_919_191, $roleId, []);
            $this->fail('Expected ValidationException');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('department_id', $exception->errors());
        }
    }
}
