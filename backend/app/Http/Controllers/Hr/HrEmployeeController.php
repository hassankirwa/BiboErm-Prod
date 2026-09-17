<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\EmployeeProfile;
use App\Models\ProfileChangeRequest;
use App\Models\User;
use App\Services\Hr\EmployeeDirectCreateService;
use App\Services\Profile\ProfileChangeRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        if ($request->boolean('has_pending_profile_change')) {
            $query->whereHas('profileChangeRequests', function ($q) {
                $q->where('status', ProfileChangeRequest::STATUS_PENDING);
            });
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

    public function store(Request $request, EmployeeDirectCreateService $creator): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'activate_now' => ['sometimes', 'boolean'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'additional_assignments' => ['nullable', 'array'],
            'additional_assignments.*.department_id' => ['required_with:additional_assignments', 'integer', 'exists:departments,id'],
            'additional_assignments.*.role_id' => ['required_with:additional_assignments', 'integer', 'exists:roles,id'],
            'employee_number' => ['nullable', 'string', 'max:50', 'unique:employee_profiles,employee_number'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:150'],
            'employment_type' => ['nullable', 'string', Rule::in(EmployeeProfile::EMPLOYMENT_TYPES)],
            'start_date' => ['nullable', 'date'],
            'work_location' => ['nullable', 'string', 'max:255'],
            'department_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'phone_alt' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'home_county' => ['nullable', 'string', 'max:100'],
            'home_area' => ['nullable', 'string', 'max:150'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:50'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:100'],
            'national_id' => ['nullable', 'string', 'max:50'],
            'kra_pin' => ['nullable', 'string', 'max:50'],
            'nssf_number' => ['nullable', 'string', 'max:50'],
            'shif_number' => ['nullable', 'string', 'max:50'],
            'bank_or_mpesa' => ['nullable', 'string', 'max:255'],
            'monthly_gross_salary' => ['nullable', 'numeric', 'min:0'],
            'reporting_manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'hr_notes' => ['nullable', 'string'],
        ]);

        $result = $creator->create($validated, $request->user());

        return response()->json([
            'message' => __('Employee created.'),
            'data' => [
                'user' => $result['user'],
                'temporary_password' => $result['temporary_password'],
            ],
        ], 201);
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
