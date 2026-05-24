<?php

namespace App\Support;

use App\Models\Department;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

final class DepartmentRoleCatalog
{
    /**
     * @return list<string>
     */
    public static function roleNamesForSlug(string $slug): array
    {
        /** @var array<string, list<string>> $map */
        $map = config('bibo.department_roles', []);

        return $map[$slug] ?? [];
    }

    /**
     * @return Collection<int, Role>
     */
    public static function rolesForDepartment(int $departmentId): Collection
    {
        $department = Department::query()->find($departmentId);

        if (! $department) {
            return collect();
        }

        $roleNames = self::roleNamesForSlug($department->slug);

        if ($roleNames === []) {
            return Role::query()->orderBy('name')->get();
        }

        return Role::query()
            ->whereIn('name', $roleNames)
            ->orderBy('name')
            ->get();
    }

    public static function assertRoleAllowedForDepartment(int $departmentId, int $roleId, string $field = 'role_id'): void
    {
        $allowedIds = self::rolesForDepartment($departmentId)->pluck('id');

        if (! $allowedIds->contains($roleId)) {
            throw ValidationException::withMessages([
                $field => [__('The selected role is not valid for this department.')],
            ]);
        }
    }
}
