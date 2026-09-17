<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Department::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'shared_email', 'is_active']);

        return response()->json([
            'data' => $departments->map(fn (Department $department) => [
                'id' => $department->id,
                'name' => $department->name,
                'slug' => $department->slug,
                'shared_email' => $department->shared_email,
                'is_active' => (bool) $department->is_active,
            ])->values(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'departments' => ['required', 'array', 'min:1'],
            'departments.*.id' => ['required', 'integer', 'exists:departments,id'],
            'departments.*.shared_email' => ['nullable', 'email', 'max:255'],
        ]);

        foreach ($validated['departments'] as $row) {
            Department::query()->whereKey($row['id'])->update([
                'shared_email' => isset($row['shared_email']) && $row['shared_email'] !== ''
                    ? mb_strtolower(trim((string) $row['shared_email']))
                    : null,
            ]);
        }

        return $this->index();
    }
}
