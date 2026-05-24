<?php

namespace App\Http\Requests\Hr;

use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmployeeHrUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $param = $this->route('user');
        $userKey = $param instanceof User ? $param->getKey() : (int) $param;

        return [
            'employee_number' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('employee_profiles', 'employee_number')->ignore($userKey, 'user_id'),
            ],
            'job_title' => ['nullable', 'string', 'max:255'],
            'employment_type' => ['nullable', 'string', Rule::in(EmployeeProfile::EMPLOYMENT_TYPES)],
            'start_date' => ['nullable', 'date'],
            'salary_grade' => ['nullable', 'string', 'max:50'],
            'reporting_manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'work_location' => ['nullable', 'string', 'max:255'],
            'contract_type' => ['nullable', 'string', Rule::in(EmployeeProfile::CONTRACT_TYPES)],
            'contract_end_date' => ['nullable', 'date'],
            'hr_notes' => ['nullable', 'string'],
        ];
    }
}
