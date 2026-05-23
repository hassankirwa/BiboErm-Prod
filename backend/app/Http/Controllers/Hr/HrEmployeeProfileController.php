<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hr\EmployeeHrUpsertRequest;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Services\Audit\OwenAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class HrEmployeeProfileController extends Controller
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
    ) {}

    public function upsert(User $user, EmployeeHrUpsertRequest $request): JsonResponse
    {
        $data = collect($request->validated())->reject(fn (mixed $value): bool => $value === null)->all();

        if (isset($data['reporting_manager_id']) && (int) $data['reporting_manager_id'] === $user->id) {
            throw ValidationException::withMessages(['reporting_manager_id' => ['Reporting manager must be someone else.']]);
        }

        /** @var EmployeeProfile $employee */
        $employee = EmployeeProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $old = [];
        foreach (array_keys($data) as $key) {
            $old[$key] = $employee->getOriginal($key);
        }

        $employee->fill($data)->save();

        $this->audit->log(
            module: 'employees',
            action: 'update_hr_details',
            entityType: 'user',
            entityId: $user->id,
            oldValues: $old ?: null,
            newValues: $employee->only(array_keys($data)),
        );

        return response()->json(['message' => __('HR record saved.'), 'employee' => $employee->fresh()]);
    }

    public function approve(User $user): JsonResponse
    {
        if ($user->status !== User::STATUS_PENDING_HR_REVIEW) {
            throw ValidationException::withMessages(['user' => ['User is not awaiting HR approval.']]);
        }

        $employee = $user->employeeProfile;

        $this->assertHrMinimumFilled($employee, $user);

        $was = ['status' => $user->status];

        $user->forceFill(['status' => User::STATUS_ACTIVE])->save();

        $this->audit->log(
            module: 'employees',
            action: 'approve',
            entityType: 'user',
            entityId: $user->id,
            oldValues: $was,
            newValues: ['status' => User::STATUS_ACTIVE],
        );

        return response()->json([
            'message' => __('Account approved.'),
            'user' => [
                'id' => $user->id,
                'status' => $user->status,
                'employee' => $employee?->fresh(),
            ],
        ]);
    }

    private function assertHrMinimumFilled(?EmployeeProfile $employee, User $user): void
    {
        if (! $employee) {
            throw ValidationException::withMessages(['employee' => __('HR employee record missing.')]);
        }

        foreach (['employee_number', 'job_title', 'employment_type', 'reporting_manager_id'] as $field) {
            if ($employee->{$field} === null || $employee->{$field} === '') {
                throw ValidationException::withMessages([
                    $field => [__('Complete required HR fields before approval.')],
                ]);
            }
        }

        if (! $employee->start_date) {
            throw ValidationException::withMessages(['start_date' => [__('Start date required before approval.')]]);
        }

        $hasPrimary = $user->departmentRoles()->where('is_primary', true)->exists();

        if (! $hasPrimary) {
            throw ValidationException::withMessages(['assignments' => ['User missing primary department assignment.']]);
        }
    }
}
