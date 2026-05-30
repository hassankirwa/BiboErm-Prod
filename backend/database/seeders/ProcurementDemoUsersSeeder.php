<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class ProcurementDemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $department = Department::query()->where('slug', 'procurement')->first();
        $role = Role::findByName('procurement_officer', config('permission.defaults.guard', 'web'));

        if (! $department || ! $role) {
            return;
        }

        $user = User::query()->firstOrCreate(
            ['email' => 'procurement@bibo.local'],
            [
                'name' => 'Procurement Officer',
                'password' => Hash::make('password'),
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        );

        UserDepartmentRole::query()->firstOrCreate([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'role_id' => $role->id,
        ]);

        $user->syncRoles([$role->name]);
    }
}
