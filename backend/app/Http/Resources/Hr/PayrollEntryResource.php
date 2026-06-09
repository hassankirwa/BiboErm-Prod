<?php

namespace App\Http\Resources\Hr;

use App\Models\PayrollEntry;
use App\Support\BiboStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayrollEntry */
class PayrollEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payroll_run_id' => $this->payroll_run_id,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'user_email' => $this->user?->email,
            'employee_number' => $this->user?->employeeProfile?->employee_number,
            'period_year' => $this->whenLoaded('payrollRun', fn () => $this->payrollRun?->period_year),
            'period_month' => $this->whenLoaded('payrollRun', fn () => $this->payrollRun?->period_month),
            'period_label' => $this->whenLoaded('payrollRun', function () {
                $run = $this->payrollRun;

                return $run ? sprintf('%02d/%d', $run->period_month, $run->period_year) : null;
            }),
            'gross_salary' => (float) $this->gross_salary,
            'nhif' => (float) $this->nhif,
            'nssf' => (float) $this->nssf,
            'paye' => (float) $this->paye,
            'other_deductions' => (float) $this->other_deductions,
            'net_pay' => (float) $this->net_pay,
            'payslip_path' => $this->payslip_path,
            'download_url' => $this->payslip_path
                ? BiboStorage::resolvePrivateApiUrl($this->payslip_path)
                : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
