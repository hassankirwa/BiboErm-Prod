<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Map config/permissions.php role keys to Spatie role names.
     *
     * @var array<string, string>
     */
    private const ROLE_MAP = [
        'sales_rep' => 'sales_representative',
    ];

    public function run(): void
    {
        $guard = config('permission.defaults.guard', 'web');

        Role::findByName('super_admin', $guard)?->syncPermissions(
            Permission::query()->where('guard_name', $guard)->get()
        );

        $grant = function (string $role, array $names) use ($guard): void {
            Role::findByName($role, $guard)?->syncPermissions($names);
        };

        foreach (config('permissions.roles', []) as $configRole => $permissions) {
            $spatieRole = self::ROLE_MAP[$configRole] ?? $configRole;
            $grant($spatieRole, $permissions);
        }
    }
}
