<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Services\Roles\SyncDepartmentRolesToSpatie;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class ModuleDemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');
        $password = (string) config('bibo.module_demo_users.password', 'password123');
        $definitions = config('bibo.module_demo_users.users', []);

        if ($definitions === []) {
            $this->command?->warn('No module demo users configured — skipping.');

            return;
        }

        $sync = app(SyncDepartmentRolesToSpatie::class);

        foreach ($definitions as $moduleKey => $definition) {
            $email = $definition['email'] ?? "{$moduleKey}@bibo.com";
            $name = $definition['name'] ?? $this->defaultDisplayName($moduleKey);
            $departmentSlug = $definition['department_slug'] ?? $moduleKey;

            $department = Department::query()->where('slug', $departmentSlug)->first();
            if (! $department) {
                $this->command?->warn("Skipping {$email}: department \"{$departmentSlug}\" not found.");

                continue;
            }

            $roleName = $definition['role'] ?? null;
            if (! is_string($roleName) || $roleName === '') {
                $this->command?->warn("Skipping {$email}: role not configured for module \"{$moduleKey}\".");

                continue;
            }

            $role = Role::findByName($roleName, $guard);
            if (! $role) {
                $this->command?->warn("Skipping {$email}: role \"{$roleName}\" not found.");

                continue;
            }

            $user = User::query()->updateOrCreate(
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

            UserDepartmentRole::query()->updateOrCreate(
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

            $sync->sync($user);

            $this->command?->info("Module demo user seeded: {$email} ({$roleName})");
        }
    }

    private function defaultDisplayName(string $moduleKey): string
    {
        $label = str($moduleKey)->replace(['_', '-'], ' ')->title()->toString();

        return "{$label} User";
    }
}
