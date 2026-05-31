<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class WarehouseDemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');
        $warehouseDept = Department::query()->where('slug', 'warehouse')->first();

        if (! $warehouseDept) {
            return;
        }

        $accessoriesRole = Role::findByName('warehouse_manager_accessories', $guard);
        $aluminiumRole = Role::findByName('warehouse_manager_aluminium', $guard);

        $this->seedUser(
            email: 'warehouse.accessories@bibo.local',
            name: 'Warehouse Manager (Accessories)',
            department: $warehouseDept,
            role: $accessoriesRole,
        );

        $this->seedUser(
            email: 'warehouse.aluminium@bibo.local',
            name: 'Warehouse Manager (Aluminium)',
            department: $warehouseDept,
            role: $aluminiumRole,
        );
    }

    private function seedUser(
        string $email,
        string $name,
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
                'password' => Hash::make('password'),
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
