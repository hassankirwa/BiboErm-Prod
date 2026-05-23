<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Models\UserProfile;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DefaultAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) config('bibo.admin.email');

        if ($email === '') {
            $this->command?->warn('ADMIN_EMAIL is empty — skipping default admin.');

            return;
        }

        /** @var Department $operationsDept */
        $operationsDept = Department::query()->where('slug', 'operations')->firstOrFail();
        $guard = config('permission.defaults.guard', 'web');
        $superAdminRole = Role::findByName('super_admin', $guard);

        $user = User::query()->firstWhere('email', $email);

        if ($user) {
            $this->command?->warn('Default admin user already exists — ensuring profile records only.');
        } else {
            $user = User::query()->create([
                'name' => config('bibo.admin.name'),
                'email' => $email,
                'password' => Hash::make((string) config('bibo.admin.password')),
                'status' => User::STATUS_ACTIVE,
                'email_verified_at' => now(),
                'onboarding_completed_at' => now(),
                'must_change_password' => false,
            ]);

            UserDepartmentRole::query()->create([
                'user_id' => $user->id,
                'department_id' => $operationsDept->id,
                'role_id' => $superAdminRole->id,
                'is_primary' => true,
                'assigned_at' => now(),
            ]);

            $this->command?->info("Default admin seeded: {$email}");
        }

        UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        EmployeeProfile::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'employee_number' => env('ADMIN_EMPLOYEE_NUMBER', 'SYS-0001'),
                'job_title' => 'Super Administrator',
                'employment_type' => 'staff',
                'start_date' => Carbon::today()->toDateString(),
                'reporting_manager_id' => null,
            ]
        );
    }
}
