<?php

namespace Tests\Unit\Hr;

use App\Models\EmployeePayComponent;
use App\Models\PayrollDeductionType;
use App\Models\User;
use App\Services\Hr\PayrollCalculationService;
use Database\Seeders\PayrollSettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PayrollSettingsSeeder::class);
    }

    public function test_calculates_shif_nssf_housing_levy_and_paye_without_nhif(): void
    {
        $result = app(PayrollCalculationService::class)->calculate(50000);

        $this->assertSame(0.0, $result['nhif']);
        $this->assertGreaterThan(0, $result['shif']);
        $this->assertGreaterThan(0, $result['nssf']);
        $this->assertGreaterThan(0, $result['paye']);
        $this->assertSame(50000.0, $result['gross_salary']);

        $codes = array_column($result['line_items'], 'code');
        $this->assertContains('shif', $codes);
        $this->assertContains('nssf', $codes);
        $this->assertContains('housing_levy', $codes);
        $this->assertContains('paye', $codes);
        $this->assertNotContains('nhif', $codes);
    }

    public function test_disabled_deduction_is_skipped(): void
    {
        PayrollDeductionType::query()
            ->where('code', PayrollDeductionType::CODE_SHIF)
            ->update(['enabled' => false]);

        $result = app(PayrollCalculationService::class)->calculate(50000);

        $this->assertSame(0.0, $result['shif']);
        $codes = array_column($result['line_items'], 'code');
        $this->assertNotContains('shif', $codes);
    }

    public function test_applies_employee_additions_and_damage_deductions(): void
    {
        $user = User::factory()->create();
        $bonus = new EmployeePayComponent([
            'user_id' => $user->id,
            'kind' => EmployeePayComponent::KIND_ADDITION,
            'category' => EmployeePayComponent::CATEGORY_BONUS,
            'label' => 'Performance bonus',
            'amount' => 5000,
            'is_recurring' => true,
        ]);
        $damage = new EmployeePayComponent([
            'user_id' => $user->id,
            'kind' => EmployeePayComponent::KIND_DEDUCTION,
            'category' => EmployeePayComponent::CATEGORY_DAMAGE,
            'label' => 'Broken glass',
            'amount' => 1500,
            'is_recurring' => false,
            'effective_from' => '2026-09-01',
            'effective_to' => '2026-09-30',
        ]);

        $result = app(PayrollCalculationService::class)->calculate(
            40000,
            0,
            $user,
            2026,
            9,
            [$bonus, $damage],
        );

        $this->assertSame(45000.0, $result['gross_salary']);
        $this->assertSame(5000.0, $result['additions_total']);
        $this->assertGreaterThanOrEqual(1500.0, $result['other_deductions']);
    }
}
