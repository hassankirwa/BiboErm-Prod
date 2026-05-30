<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class HrDemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');
        $hrDept = Department::query()->where('slug', 'hr')->first()
            ?? Department::query()->where('slug', 'operations')->first();

        if (! $hrDept) {
            return;
        }

        $hrRole = Role::findByName('hr_manager', $guard);

        if (! $hrRole) {
            return;
        }

        $user = User::query()->firstOrCreate(
            ['email' => 'hr@bibo.local'],
            [
                'name' => 'HR Manager',
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
                'department_id' => $hrDept->id,
                'role_id' => $hrRole->id,
            ],
            [
                'is_primary' => true,
                'assigned_at' => now(),
            ],
        );

        $user->syncRoles([$hrRole->name]);
    }
}
