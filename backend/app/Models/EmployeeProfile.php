<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeProfile extends Model
{
    public const EMPLOYMENT_FULL_TIME = 'full_time';

    public const EMPLOYMENT_PART_TIME = 'part_time';

    public const EMPLOYMENT_CONTRACT = 'contract';

    /**
     * @var list<string>
     */
    public const EMPLOYMENT_TYPES = [
        self::EMPLOYMENT_FULL_TIME,
        self::EMPLOYMENT_PART_TIME,
        self::EMPLOYMENT_CONTRACT,
    ];

    public const CONTRACT_PERMANENT = 'permanent';

    public const CONTRACT_FIXED_TERM = 'fixed_term';

    public const CONTRACT_PROBATION = 'probation';

    public const CONTRACT_INTERN = 'intern';

    public const CONTRACT_CONSULTANT = 'consultant';

    /**
     * @var list<string>
     */
    public const CONTRACT_TYPES = [
        self::CONTRACT_PERMANENT,
        self::CONTRACT_FIXED_TERM,
        self::CONTRACT_PROBATION,
        self::CONTRACT_INTERN,
        self::CONTRACT_CONSULTANT,
    ];

    protected $fillable = [
        'user_id',
        'employee_number',
        'job_title',
        'unit',
        'employment_type',
        'start_date',
        'salary_grade',
        'monthly_gross_salary',
        'reporting_manager_id',
        'work_location',
        'department_email',
        'national_id',
        'kra_pin',
        'nssf_number',
        'shif_number',
        'bank_or_mpesa',
        'contract_type',
        'contract_end_date',
        'hr_notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'contract_end_date' => 'date',
            'monthly_gross_salary' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<User, EmployeeProfile>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, EmployeeProfile>
     */
    public function reportingManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporting_manager_id');
    }
}
