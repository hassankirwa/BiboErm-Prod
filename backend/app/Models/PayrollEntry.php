<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollEntry extends Model
{
    protected $fillable = [
        'payroll_run_id',
        'user_id',
        'gross_salary',
        'additions_total',
        'shif',
        'nhif',
        'nssf',
        'paye',
        'other_deductions',
        'line_items',
        'net_pay',
        'payslip_path',
    ];

    protected function casts(): array
    {
        return [
            'gross_salary' => 'decimal:2',
            'additions_total' => 'decimal:2',
            'shif' => 'decimal:2',
            'nhif' => 'decimal:2',
            'nssf' => 'decimal:2',
            'paye' => 'decimal:2',
            'other_deductions' => 'decimal:2',
            'line_items' => 'array',
            'net_pay' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<PayrollRun, PayrollEntry>
     */
    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    /**
     * @return BelongsTo<User, PayrollEntry>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
