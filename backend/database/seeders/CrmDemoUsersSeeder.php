<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class CrmDemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');
        $salesDept = Department::query()->where('slug', 'sales_marketing')->first()
            ?? Department::query()->where('slug', 'operations')->first();

        if (! $salesDept) {
            return;
        }

        $salesRole = Role::findByName('sales_representative', $guard);
        $fieldRole = Role::findByName('field_officer', $guard);

        $this->seedUser(
            email: 'sales@bibo.local',
            name: 'Sales Representative',
            password: 'password',
            department: $salesDept,
            role: $salesRole,
        );

        $fieldDept = Department::query()->where('slug', 'field')->first()
            ?? $salesDept;

        $this->seedUser(
            email: 'field@bibo.local',
            name: 'Field Officer',
            password: 'password',
            department: $fieldDept,
            role: $fieldRole,
        );
    }

    private function seedUser(
        string $email,
        string $name,
        string $password,
        Department $department,
        ?Role $role,
    ): void {
        if (! $role) {
            return;
        }

        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'status' => User::STATUS_ACTIVE,
                'email_verified_at' => now(),
                'onboarding_completed_at' => now(),
                'must_change_password' => false,
            ],
        );

        UserDepartmentRole::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'department_id' => $department->id,
                'role_id' => $role->id,
            ],
            [
                'is_primary' => true,
                'assigned_at' => now(),
            ],
        );

        $user->syncRoles([$role->name]);
    }
}
