<?php

namespace App\Services\Hr;

use App\Models\EmployeePayComponent;
use App\Models\PayrollDeductionType;
use App\Models\PayrollSetting;
use App\Models\User;

class PayrollCalculationService
{
    /**
     * @param  list<EmployeePayComponent>|null  $components
     * @return array{
     *     gross_salary: float,
     *     additions_total: float,
     *     shif: float,
     *     nhif: float,
     *     nssf: float,
     *     paye: float,
     *     other_deductions: float,
     *     net_pay: float,
     *     line_items: list<array{code: string, name: string, kind: string, amount: float}>
     * }
     */
    public function calculate(
        float $basicSalary,
        float $manualOtherDeductions = 0,
        ?User $employee = null,
        ?int $periodYear = null,
        ?int $periodMonth = null,
        ?array $components = null,
    ): array {
        $settings = PayrollSetting::current();
        $deductionTypes = PayrollDeductionType::query()
            ->where('enabled', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $periodComponents = $components ?? $this->componentsForPeriod($employee, $periodYear, $periodMonth);

        $additionLines = [];
        $additionsTotal = 0.0;
        $extraDeductionLines = [];
        $extraDeductionsTotal = 0.0;

        foreach ($periodComponents as $component) {
            $amount = round((float) $component->amount, 2);
            $label = $component->label
                ?: str_replace('_', ' ', ucfirst($component->category));

            if ($component->kind === EmployeePayComponent::KIND_ADDITION) {
                $additionsTotal += $amount;
                $additionLines[] = [
                    'code' => $component->category,
                    'name' => $label,
                    'kind' => 'addition',
                    'amount' => $amount,
                ];
            } else {
                $extraDeductionsTotal += $amount;
                $extraDeductionLines[] = [
                    'code' => $component->category,
                    'name' => $label,
                    'kind' => 'deduction',
                    'amount' => $amount,
                ];
            }
        }

        $gross = round($basicSalary + $additionsTotal, 2);
        $lineItems = $additionLines;

        $shif = 0.0;
        $nssf = 0.0;
        $paye = 0.0;
        $otherStatutory = 0.0;
        $taxDeductible = 0.0;

        foreach ($deductionTypes as $type) {
            if ($type->code === PayrollDeductionType::CODE_PAYE) {
                continue;
            }

            $amount = $this->amountForType($type, $gross, $settings);
            if ($amount <= 0) {
                continue;
            }

            $lineItems[] = [
                'code' => $type->code,
                'name' => $type->name,
                'kind' => 'deduction',
                'amount' => $amount,
            ];

            if ($type->code === PayrollDeductionType::CODE_SHIF) {
                $shif = $amount;
            } elseif ($type->code === PayrollDeductionType::CODE_NSSF) {
                $nssf = $amount;
            } else {
                $otherStatutory += $amount;
            }

            if ($type->tax_deductible) {
                $taxDeductible += $amount;
            }
        }

        $payeType = $deductionTypes->firstWhere('code', PayrollDeductionType::CODE_PAYE);
        if ($payeType) {
            $taxable = max(0, $gross - $taxDeductible);
            $paye = $this->calculatePaye($taxable, $settings);
            if ($paye > 0) {
                $lineItems[] = [
                    'code' => PayrollDeductionType::CODE_PAYE,
                    'name' => $payeType->name,
                    'kind' => 'deduction',
                    'amount' => $paye,
                ];
            }
        }

        $manualOther = round(max(0, $manualOtherDeductions), 2);
        if ($manualOther > 0) {
            $lineItems[] = [
                'code' => 'manual_other',
                'name' => 'Other deductions',
                'kind' => 'deduction',
                'amount' => $manualOther,
            ];
        }

        foreach ($extraDeductionLines as $line) {
            $lineItems[] = $line;
        }

        $otherDeductions = round($otherStatutory + $extraDeductionsTotal + $manualOther, 2);
        $netPay = max(0, round($gross - $shif - $nssf - $paye - $otherDeductions, 2));

        return [
            'gross_salary' => $gross,
            'additions_total' => round($additionsTotal, 2),
            'shif' => round($shif, 2),
            'nhif' => 0.0,
            'nssf' => round($nssf, 2),
            'paye' => round($paye, 2),
            'other_deductions' => $otherDeductions,
            'net_pay' => $netPay,
            'line_items' => $lineItems,
        ];
    }

    /**
     * @return list<EmployeePayComponent>
     */
    public function componentsForPeriod(?User $employee, ?int $year, ?int $month): array
    {
        if ($employee === null || $year === null || $month === null) {
            return [];
        }

        return EmployeePayComponent::query()
            ->where('user_id', $employee->id)
            ->get()
            ->filter(fn (EmployeePayComponent $component) => $component->appliesToPeriod($year, $month))
            ->values()
            ->all();
    }

    private function amountForType(PayrollDeductionType $type, float $gross, PayrollSetting $settings): float
    {
        return match ($type->method) {
            PayrollDeductionType::METHOD_PERCENT_OF_GROSS => round($gross * (float) $type->rate, 2),
            PayrollDeductionType::METHOD_FIXED => round((float) $type->amount, 2),
            PayrollDeductionType::METHOD_NSSF_TIERED => $this->calculateNssf($gross, $settings),
            default => 0.0,
        };
    }

    private function calculateNssf(float $gross, PayrollSetting $settings): float
    {
        $tier1Cap = (float) $settings->nssf_tier1_cap;
        $tier2Cap = (float) $settings->nssf_tier2_cap;
        $rate = (float) $settings->nssf_rate;

        $tier1 = min($gross, $tier1Cap) * $rate;
        $tier2Base = max(0, min($gross, $tier2Cap) - $tier1Cap);
        $tier2 = $tier2Base * $rate;

        return round($tier1 + $tier2, 2);
    }

    private function calculatePaye(float $taxableIncome, PayrollSetting $settings): float
    {
        $bands = $settings->paye_bands ?: config('bibo.payroll.paye_bands', []);
        $relief = (float) $settings->personal_relief;
        $tax = 0.0;
        $previousMax = 0.0;

        foreach ($bands as $band) {
            $max = (float) $band['max'];
            $rate = (float) $band['rate'];

            if ($taxableIncome <= $previousMax) {
                break;
            }

            $bandTop = min($taxableIncome, $max);
            $bandAmount = max(0, $bandTop - $previousMax);
            $tax += $bandAmount * $rate;
            $previousMax = $max;
        }

        return round(max(0, $tax - $relief), 2);
    }
}
