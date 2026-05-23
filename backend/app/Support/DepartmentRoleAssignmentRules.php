<?php

namespace App\Support;

use App\Models\Department;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

final class DepartmentRoleAssignmentRules
{
    /**
     * @param  array<int, array<string, mixed>>  $additionalAssignments
     */
    public static function validate(
        int $departmentId,
        int $roleId,
        array $additionalAssignments,
        string $additionalKeyPrefix = 'additional_assignments',
    ): void {
        if (! Department::query()->whereKey($departmentId)->exists()) {
            throw ValidationException::withMessages(['department_id' => ['Invalid department.']]);
        }

        if (! Role::query()->whereKey($roleId)->exists()) {
            throw ValidationException::withMessages(['role_id' => ['Invalid role.']]);
        }

        foreach ($additionalAssignments as $i => $row) {
            if (! isset($row['department_id'], $row['role_id'])) {
                throw ValidationException::withMessages(["{$additionalKeyPrefix}.{$i}" => ['Each row requires department_id and role_id.']]);
            }

            if (! Department::query()->whereKey($row['department_id'])->exists()) {
                throw ValidationException::withMessages(["{$additionalKeyPrefix}.{$i}.department_id" => ['Invalid department.']]);
            }

            if (! Role::query()->whereKey($row['role_id'])->exists()) {
                throw ValidationException::withMessages(["{$additionalKeyPrefix}.{$i}.role_id" => ['Invalid role.']]);
            }
        }
    }
}
