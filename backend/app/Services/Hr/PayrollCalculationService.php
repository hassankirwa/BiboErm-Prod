<?php

namespace App\Services\Hr;

class PayrollCalculationService
{
    /**
     * @return array{gross_salary: float, nhif: float, nssf: float, paye: float, net_pay: float}
     */
    public function calculate(float $grossSalary, float $otherDeductions = 0): array
    {
        $nhif = $this->calculateNhif($grossSalary);
        $nssf = $this->calculateNssf($grossSalary);
        $taxable = max(0, $grossSalary - $nssf);
        $paye = $this->calculatePaye($taxable);
        $netPay = max(0, $grossSalary - $nhif - $nssf - $paye - $otherDeductions);

        return [
            'gross_salary' => round($grossSalary, 2),
            'nhif' => round($nhif, 2),
            'nssf' => round($nssf, 2),
            'paye' => round($paye, 2),
            'net_pay' => round($netPay, 2),
        ];
    }

    private function calculateNhif(float $gross): float
    {
        $tiers = config('bibo.payroll.nhif_tiers', []);

        foreach ($tiers as $tier) {
            if ($gross >= $tier['min'] && $gross <= $tier['max']) {
                return (float) $tier['amount'];
            }
        }

        return 0;
    }

    private function calculateNssf(float $gross): float
    {
        $tier1Cap = (float) config('bibo.payroll.nssf_tier1_cap', 7000);
        $tier2Cap = (float) config('bibo.payroll.nssf_tier2_cap', 36000);
        $rate = (float) config('bibo.payroll.nssf_rate', 0.06);

        $tier1 = min($gross, $tier1Cap) * $rate;
        $tier2Base = max(0, min($gross, $tier2Cap) - $tier1Cap);
        $tier2 = $tier2Base * $rate;

        return $tier1 + $tier2;
    }

    private function calculatePaye(float $taxableIncome): float
    {
        $bands = config('bibo.payroll.paye_bands', []);
        $relief = (float) config('bibo.payroll.personal_relief', 2400);
        $tax = 0.0;
        $previousMax = 0;

        foreach ($bands as $band) {
            $min = (float) $band['min'];
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

        return max(0, $tax - $relief);
    }
}
