<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Support\DepartmentRoleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class AdminLookupController extends Controller
{
    public function departments(): JsonResponse
    {
        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'shared_email']);

        return response()->json($departments);
    }

    public function roles(Request $request): JsonResponse
    {
        if ($request->filled('department_id')) {
            $roles = DepartmentRoleCatalog::rolesForDepartment((int) $request->integer('department_id'));
        } else {
            $roles = Role::query()->orderBy('name')->get();
        }

        $payload = $roles->map(fn (Role $role) => [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->name,
        ])->values();

        return response()->json($payload);
    }
}
