<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Profile\ProfileChangeRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrEmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = User::query()
            ->with([
                'profile',
                'employeeProfile',
                'departmentRoles.role',
                'departmentRoles.department',
            ])
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('department_id')) {
            $departmentId = (int) $request->integer('department_id');
            $query->whereHas('departmentRoles', fn ($q) => $q->where('department_id', $departmentId));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->trim().'%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search)
                    ->orWhereHas('employeeProfile', fn ($eq) => $eq->where('employee_number', 'like', $search));
            });
        }

        return response()->json($query->paginate($perPage));
    }

    public function show(User $user): JsonResponse
    {
        $user->load([
            'profile',
            'employeeProfile.reportingManager',
            'departmentRoles.role',
            'departmentRoles.department',
        ]);

        $employee = $user->employeeProfile;
        $manager = $employee?->reportingManager;
        $pendingRequest = app(ProfileChangeRequestService::class)->pendingForUser($user->id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                'onboarding_completed_at' => $user->onboarding_completed_at?->toIso8601String(),
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ],
            'profile' => $user->profile,
            'employee' => $employee,
            'departments' => $user->departmentRoles->map(fn ($row) => [
                'id' => $row->department?->id,
                'name' => $row->department?->name,
                'slug' => $row->department?->slug,
                'is_primary' => (bool) $row->is_primary,
                'role_id' => $row->role_id,
                'role' => $row->role?->name,
            ])->values()->all(),
            'reporting_manager' => $manager ? [
                'id' => $manager->id,
                'name' => $manager->name,
                'email' => $manager->email,
            ] : null,
            'pending_change_request' => ProfileChangeRequestService::serialize($pendingRequest),
        ]);
    }
}
