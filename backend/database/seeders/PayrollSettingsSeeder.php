<?php

namespace Database\Seeders;

use App\Models\PayrollDeductionType;
use App\Models\PayrollSetting;
use Illuminate\Database\Seeder;

class PayrollSettingsSeeder extends Seeder
{
    public function run(): void
    {
        PayrollSetting::current();

        $defaults = [
            [
                'code' => PayrollDeductionType::CODE_SHIF,
                'name' => 'SHIF (SHA)',
                'method' => PayrollDeductionType::METHOD_PERCENT_OF_GROSS,
                'rate' => 0.0275,
                'amount' => null,
                'tax_deductible' => false,
                'enabled' => true,
                'is_system' => true,
                'sort_order' => 10,
            ],
            [
                'code' => PayrollDeductionType::CODE_NSSF,
                'name' => 'NSSF',
                'method' => PayrollDeductionType::METHOD_NSSF_TIERED,
                'rate' => null,
                'amount' => null,
                'tax_deductible' => true,
                'enabled' => true,
                'is_system' => true,
                'sort_order' => 20,
            ],
            [
                'code' => PayrollDeductionType::CODE_HOUSING_LEVY,
                'name' => 'Housing Levy',
                'method' => PayrollDeductionType::METHOD_PERCENT_OF_GROSS,
                'rate' => 0.015,
                'amount' => null,
                'tax_deductible' => true,
                'enabled' => true,
                'is_system' => false,
                'sort_order' => 30,
            ],
            [
                'code' => PayrollDeductionType::CODE_PAYE,
                'name' => 'PAYE',
                'method' => PayrollDeductionType::METHOD_PAYE_BANDS,
                'rate' => null,
                'amount' => null,
                'tax_deductible' => false,
                'enabled' => true,
                'is_system' => true,
                'sort_order' => 40,
            ],
        ];

        foreach ($defaults as $row) {
            PayrollDeductionType::query()->updateOrCreate(
                ['code' => $row['code']],
                $row,
            );
        }
    }
}
