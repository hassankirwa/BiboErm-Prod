<?php

namespace App\Services\Hr;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Models\UserProfile;
use App\Services\Audit\OwenAuditLogger;
use App\Support\DepartmentRoleAssignmentRules;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmployeeDirectCreateService
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
        private readonly EmployeeNumberGenerator $numbers,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array{department_id: int, role_id: int}>  $additionalAssignments
     * @return array{user: User, temporary_password: string|null}
     */
    public function create(array $data, User $actor): array
    {
        $email = mb_strtolower(trim((string) ($data['email'] ?? '')));
        $name = trim((string) ($data['name'] ?? ''));
        $activateNow = (bool) ($data['activate_now'] ?? false);
        $departmentId = (int) $data['department_id'];
        $roleId = (int) $data['role_id'];
        $additional = is_array($data['additional_assignments'] ?? null)
            ? $data['additional_assignments']
            : [];

        if ($email === '') {
            $staffNo = preg_replace('/\W+/', '', (string) ($data['employee_number'] ?? '')) ?: Str::lower(Str::random(6));
            $email = 'import.'.mb_strtolower($staffNo).'@pending.bibo.internal';
        }

        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => ['A user with this email already exists.']]);
        }

        DepartmentRoleAssignmentRules::validate($departmentId, $roleId, $additional);

        $employeeNumber = trim((string) ($data['employee_number'] ?? ''));
        if ($employeeNumber === '') {
            $employeeNumber = $this->numbers->suggest();
        }

        if (EmployeeProfile::query()->where('employee_number', $employeeNumber)->exists()) {
            throw ValidationException::withMessages([
                'employee_number' => ['This employee number is already in use.'],
            ]);
        }

        $departmentEmail = $data['department_email'] ?? null;
        if (! $departmentEmail) {
            $departmentEmail = Department::query()->whereKey($departmentId)->value('shared_email');
        }

        $tempPassword = Str::password(14);

            $user = DB::transaction(function () use (
            $email,
            $name,
            $activateNow,
            $departmentId,
            $roleId,
            $additional,
            $actor,
            $data,
            $employeeNumber,
            $tempPassword,
            $departmentEmail,
        ) {
            $user = User::query()->create([
                'name' => $name !== '' ? $name : Str::before($email, '@'),
                'email' => $email,
                'password' => Hash::make($tempPassword),
                'status' => $activateNow ? User::STATUS_ACTIVE : User::STATUS_PENDING_HR_REVIEW,
                'invited_by' => $actor->id,
                'must_change_password' => true,
                'email_verified_at' => $activateNow ? now() : null,
                'onboarding_completed_at' => $activateNow ? now() : null,
            ]);

            UserProfile::query()->create([
                'user_id' => $user->id,
                'phone' => $data['phone'] ?? null,
                'phone_alt' => $data['phone_alt'] ?? null,
                'address' => $data['address'] ?? null,
                'home_county' => $data['home_county'] ?? null,
                'home_area' => $data['home_area'] ?? null,
                'emergency_contact_name' => $data['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $data['emergency_contact_phone'] ?? null,
                'emergency_contact_relationship' => $data['emergency_contact_relationship'] ?? null,
            ]);

            EmployeeProfile::query()->create([
                'user_id' => $user->id,
                'employee_number' => $employeeNumber,
                'job_title' => $data['job_title'] ?? null,
                'unit' => $data['unit'] ?? null,
                'employment_type' => $data['employment_type'] ?? EmployeeProfile::EMPLOYMENT_FULL_TIME,
                'start_date' => $data['start_date'] ?? null,
                'work_location' => $data['work_location'] ?? null,
                'department_email' => $departmentEmail,
                'national_id' => $data['national_id'] ?? null,
                'kra_pin' => $data['kra_pin'] ?? null,
                'nssf_number' => $data['nssf_number'] ?? null,
                'shif_number' => $data['shif_number'] ?? null,
                'bank_or_mpesa' => $data['bank_or_mpesa'] ?? null,
                'monthly_gross_salary' => $data['monthly_gross_salary'] ?? null,
                'reporting_manager_id' => $data['reporting_manager_id'] ?? null,
                'hr_notes' => $data['hr_notes'] ?? null,
            ]);

            $assignmentRows = [[
                'department_id' => $departmentId,
                'role_id' => $roleId,
                'is_primary' => true,
            ]];
            $seen = [$departmentId.'-'.$roleId => true];
            foreach ($additional as $row) {
                $key = ((int) $row['department_id']).'-'.((int) $row['role_id']);
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $assignmentRows[] = [
                    'department_id' => (int) $row['department_id'],
                    'role_id' => (int) $row['role_id'],
                    'is_primary' => false,
                ];
            }

            foreach ($assignmentRows as $row) {
                UserDepartmentRole::query()->create([
                    'user_id' => $user->id,
                    'department_id' => $row['department_id'],
                    'role_id' => $row['role_id'],
                    'is_primary' => $row['is_primary'],
                    'assigned_by' => $actor->id,
                    'assigned_at' => now(),
                ]);
            }

            return $user;
        });

        $this->audit->log(
            module: 'employees',
            action: 'create',
            entityType: 'user',
            entityId: $user->id,
            newValues: [
                'email' => $user->email,
                'status' => $user->status,
                'employee_number' => $employeeNumber,
            ],
        );

        return [
            'user' => $user->fresh(['profile', 'employeeProfile', 'departmentRoles.department', 'departmentRoles.role']),
            'temporary_password' => $tempPassword,
        ];
    }
}
