<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeProfile extends Model
{
    protected $fillable = [
        'user_id',
        'employee_number',
        'job_title',
        'employment_type',
        'start_date',
        'salary_grade',
        'reporting_manager_id',
        'work_location',
        'contract_type',
        'contract_end_date',
        'hr_notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'contract_end_date' => 'date',
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
