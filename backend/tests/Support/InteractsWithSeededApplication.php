<?php

namespace Tests\Support;

use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\PayrollSettingsSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;

trait InteractsWithSeededApplication
{
    /**
     * SPA-style headers required so Laravel Sanctum treats the route as stateful,
     * which boots the session stack used by Login / Logout / InviteAccept.
     *
     * @param  array<string, string>  $additional
     * @return array<string, string>
     */
    protected function spaApiHeaders(array $additional = []): array
    {
        $origin = rtrim((string) config('app.url'), '/');

        return array_merge([
            'Accept' => 'application/json',
            'Origin' => $origin,
            // Sanctum's stateful matchers use glob patterns such as `{host-with-port}/*`.
            // A bare `{host}/` referrer does NOT match `{host}/*`, so include a trailing path segment.
            'Referer' => $origin.'/spa-testing',
        ], $additional);
    }

    /**
     * Authenticate requests as the given user via Sanctum while keeping roles on the web guard,
     * which matches Spatie Permission rows created by seeders.
     */
    protected function actingAsSanctum(User $user): static
    {
        Sanctum::actingAs($user, [], 'web');

        return $this->withHeaders($this->spaApiHeaders());
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $additionalHeaders
     */
    protected function postJsonStateful(string $uri, array $payload = [], array $additionalHeaders = []): TestResponse
    {
        return $this->withHeaders($this->spaApiHeaders($additionalHeaders))->postJson($uri, $payload);
    }

    protected function seedApplication(): void
    {
        $this->seed([
            PermissionSeeder::class,
            RoleSeeder::class,
            DepartmentSeeder::class,
            RolePermissionSeeder::class,
            PayrollSettingsSeeder::class,
        ]);
    }

    /**
     * Create an active user and attach a primary department-role row so Spatie roles sync.
     */
    protected function userWithDepartmentRole(string $departmentSlug, string $roleName, array $overrides = []): User
    {
        /** @var User $user */
        $user = User::factory()->create(array_merge([
            'status' => User::STATUS_ACTIVE,
        ], $overrides));

        $department = Department::query()->where('slug', $departmentSlug)->firstOrFail();

        /** @var Role $role */
        $role = Role::findByName($roleName, (string) config('permission.defaults.guard', 'web'));

        UserDepartmentRole::query()->create([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'role_id' => $role->id,
            'is_primary' => true,
            'assigned_by' => $user->id,
            'assigned_at' => now(),
        ]);

        return $user->fresh();
    }
}
