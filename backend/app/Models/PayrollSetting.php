<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollSetting extends Model
{
    protected $fillable = [
        'nssf_tier1_cap',
        'nssf_tier2_cap',
        'nssf_rate',
        'personal_relief',
        'annual_leave_days',
        'paye_bands',
    ];

    protected function casts(): array
    {
        return [
            'nssf_tier1_cap' => 'decimal:2',
            'nssf_tier2_cap' => 'decimal:2',
            'nssf_rate' => 'decimal:4',
            'personal_relief' => 'decimal:2',
            'annual_leave_days' => 'integer',
            'paye_bands' => 'array',
        ];
    }

    public static function current(): self
    {
        $existing = static::query()->first();
        if ($existing) {
            return $existing;
        }

        return static::query()->create([
            'nssf_tier1_cap' => (float) config('bibo.payroll.nssf_tier1_cap', 7000),
            'nssf_tier2_cap' => (float) config('bibo.payroll.nssf_tier2_cap', 36000),
            'nssf_rate' => (float) config('bibo.payroll.nssf_rate', 0.06),
            'personal_relief' => (float) config('bibo.payroll.personal_relief', 2400),
            'annual_leave_days' => (int) config('bibo.hr.annual_leave_days', 21),
            'paye_bands' => config('bibo.payroll.paye_bands', []),
        ]);
    }
}
