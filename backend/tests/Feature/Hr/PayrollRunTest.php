<?php

namespace Tests\Feature\Hr;

use App\Models\EmployeeProfile;
use App\Models\PayrollEntry;
use App\Models\PayrollRun;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\FeatureTestCase;
use Tests\Support\InteractsWithSeededApplication;

class PayrollRunTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_hr_manager_can_create_and_generate_payroll_run(): void
    {
        $hr = $this->userWithDepartmentRole('hr', 'hr_manager');

        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        EmployeeProfile::query()->create([
            'user_id' => $employee->id,
            'employee_number' => 'EMP1001',
            'job_title' => 'Technician',
            'employment_type' => EmployeeProfile::EMPLOYMENT_FULL_TIME,
            'monthly_gross_salary' => 50000,
        ]);

        $this->actingAsSanctum($hr);

        $create = $this->postJson('/api/v1/hr/payroll-runs', [
            'period_year' => 2026,
            'period_month' => 6,
        ])->assertCreated();

        $runId = $create->json('data.id');

        $this->postJson('/api/v1/hr/payroll-runs/'.$runId.'/generate')
            ->assertOk()
            ->assertJsonPath('data.entries.0.user_id', $employee->id);

        $this->assertDatabaseHas('payroll_entries', [
            'payroll_run_id' => $runId,
            'user_id' => $employee->id,
            'gross_salary' => 50000,
        ]);
    }

    public function test_finance_officer_can_approve_payroll_run(): void
    {
        $finance = $this->userWithDepartmentRole('finance', 'finance_officer');
        $hr = $this->userWithDepartmentRole('hr', 'hr_manager');

        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        EmployeeProfile::query()->create([
            'user_id' => $employee->id,
            'employee_number' => 'EMP1002',
            'job_title' => 'Sales Rep',
            'employment_type' => EmployeeProfile::EMPLOYMENT_FULL_TIME,
            'monthly_gross_salary' => 45000,
        ]);

        $this->actingAsSanctum($hr);

        $runId = $this->postJson('/api/v1/hr/payroll-runs', [
            'period_year' => 2026,
            'period_month' => 5,
        ])->json('data.id');

        $this->postJson('/api/v1/hr/payroll-runs/'.$runId.'/generate')->assertOk();
        $this->postJson('/api/v1/hr/payroll-runs/'.$runId.'/submit')->assertOk();

        $this->actingAsSanctum($finance);

        $this->postJson('/api/v1/hr/payroll-runs/'.$runId.'/approve')
            ->assertOk()
            ->assertJsonPath('data.status', PayrollRun::STATUS_APPROVED);

        Sanctum::actingAs($employee);
        $this->withHeaders($this->spaApiHeaders());

        $this->getJson('/api/v1/my/payslips')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
