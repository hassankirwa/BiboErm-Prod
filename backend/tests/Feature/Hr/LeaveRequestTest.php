<?php

namespace Tests\Feature\Hr;

use App\Models\LeaveRequest;
use App\Models\User;
use Tests\Feature\FeatureTestCase;
use Tests\Support\InteractsWithSeededApplication;

class LeaveRequestTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_active_user_can_submit_leave_request(): void
    {
        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        $this->actingAsSanctum($employee);

        $this->postJson('/api/v1/leave-requests', [
            'leave_type' => LeaveRequest::TYPE_ANNUAL,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-05',
            'reason' => 'Family trip',
        ])->assertCreated()
            ->assertJsonFragment(['status' => LeaveRequest::STATUS_PENDING]);

        $this->assertDatabaseHas('leave_requests', [
            'user_id' => $employee->id,
            'leave_type' => LeaveRequest::TYPE_ANNUAL,
            'status' => LeaveRequest::STATUS_PENDING,
        ]);
    }

    public function test_overlapping_leave_request_is_rejected(): void
    {
        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        LeaveRequest::query()->create([
            'user_id' => $employee->id,
            'leave_type' => LeaveRequest::TYPE_ANNUAL,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-05',
            'status' => LeaveRequest::STATUS_APPROVED,
        ]);

        $this->actingAsSanctum($employee);

        $this->postJson('/api/v1/leave-requests', [
            'leave_type' => LeaveRequest::TYPE_SICK,
            'start_date' => '2026-07-03',
            'end_date' => '2026-07-04',
        ])->assertUnprocessable();
    }

    public function test_hr_manager_can_approve_leave_request(): void
    {
        $hr = $this->userWithDepartmentRole('hr', 'hr_manager');
        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        $leaveRequest = LeaveRequest::query()->create([
            'user_id' => $employee->id,
            'leave_type' => LeaveRequest::TYPE_ANNUAL,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-03',
            'status' => LeaveRequest::STATUS_PENDING,
        ]);

        $this->actingAsSanctum($hr);

        $this->postJson('/api/v1/hr/leave-requests/'.$leaveRequest->id.'/approve')
            ->assertOk()
            ->assertJsonFragment(['status' => LeaveRequest::STATUS_APPROVED]);
    }

    public function test_non_hr_cannot_review_leave_requests(): void
    {
        $sales = $this->userWithDepartmentRole('sales_marketing', 'sales_representative');
        $employee = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        $leaveRequest = LeaveRequest::query()->create([
            'user_id' => $employee->id,
            'leave_type' => LeaveRequest::TYPE_ANNUAL,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-03',
            'status' => LeaveRequest::STATUS_PENDING,
        ]);

        $this->actingAsSanctum($sales);

        $this->postJson('/api/v1/hr/leave-requests/'.$leaveRequest->id.'/approve')
            ->assertForbidden();
    }
}
