<?php

namespace Tests\Feature;

use App\Mail\UserInvitedMail;
use App\Models\Department;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\Support\InteractsWithSeededApplication;

class AdminUserManagementTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_admin_users_guest_unauthorized(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_admin_users_forbidden_without_permission(): void
    {
        $user = $this->userWithDepartmentRole('sales_marketing', 'sales_representative');
        $this->actingAsSanctum($user);

        $this->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_admin_users_index_ok_for_permissioned_roles(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $this->actingAsSanctum($admin);

        $response = $this->getJson('/api/admin/users');
        $response->assertOk()->assertJsonStructure([
            'data',
            'current_page',
            'per_page',
        ]);
    }

    public function test_invite_validation_errors_when_payload_invalid(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $this->actingAsSanctum($admin);

        $this->postJson('/api/admin/users/invite', [
            'email' => 'bad-email',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'department_id', 'role_id']);
    }

    public function test_invite_forbidden_for_users_without_permission(): void
    {
        $sales = $this->userWithDepartmentRole('sales_marketing', 'sales_representative');
        $this->actingAsSanctum($sales);

        $dept = Department::query()->firstOrFail();

        $this->postJson('/api/admin/users/invite', [
            'email' => 'cant-invite@example.com',
            'department_id' => $dept->id,
            'role_id' => Role::findByName('sales_representative', (string) config('permission.defaults.guard', 'web'))->id,
        ])->assertForbidden();
    }

    public function test_invite_creates_pending_user_when_permitted(): void
    {
        Mail::fake();

        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $guard = (string) config('permission.defaults.guard', 'web');
        $salesDept = Department::query()->where('slug', 'sales_marketing')->firstOrFail();
        $salesRole = Role::findByName('sales_representative', $guard)->id;

        $this->actingAsSanctum($admin);

        $this->postJson('/api/admin/users/invite', [
            'email' => 'invite-new@example.com',
            'name' => 'New Hire',
            'department_id' => $salesDept->id,
            'role_id' => $salesRole,
            'additional_assignments' => [],
        ])->assertCreated()
            ->assertJsonFragment(['message' => __('Invitation email sent.')]);

        $this->assertDatabaseHas('users', [
            'email' => 'invite-new@example.com',
            'status' => User::STATUS_INVITED,
        ]);
        Mail::assertSent(UserInvitedMail::class);
    }

    public function test_replace_assignments_rejects_unknown_department(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $subject = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        /** @var UserDepartmentRole $row */
        $row = $subject->departmentRoles()->create([
            'department_id' => Department::firstOrFail()->id,
            'role_id' => Role::firstOrFail()->id,
            'is_primary' => true,
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);
        unset($row);

        $subject->refresh();

        $this->actingAsSanctum($admin);

        $guard = (string) config('permission.defaults.guard', 'web');

        $this->putJson('/api/admin/users/'.$subject->id.'/assignments', [
            'department_id' => 99999999,
            'role_id' => Role::findByName('project_manager', $guard)->id,
            'additional_assignments' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['department_id']);
    }

    public function test_replace_assignments_succeeds_for_valid_primary_and_additional_roles(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $subject = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        $deptA = Department::query()->where('slug', 'sales_marketing')->firstOrFail();
        $deptB = Department::query()->where('slug', 'finance')->firstOrFail();
        $guard = (string) config('permission.defaults.guard', 'web');
        $roleA = Role::findByName('sales_representative', $guard)->id;
        $roleB = Role::findByName('finance_officer', $guard)->id;
        $projectDept = Department::query()->where('slug', 'project_management')->firstOrFail();
        $projectRole = Role::findByName('project_manager', $guard)->id;

        /** @var UserDepartmentRole $stub */
        $stub = $subject->departmentRoles()->create([
            'department_id' => $deptA->id,
            'role_id' => $roleA,
            'is_primary' => true,
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);
        unset($stub);

        $this->actingAsSanctum($admin);

        $this->putJson('/api/admin/users/'.$subject->id.'/assignments', [
            'department_id' => $deptB->id,
            'role_id' => $roleB,
            'additional_assignments' => [
                [
                    'department_id' => $projectDept->id,
                    'role_id' => $projectRole,
                ],
            ],
        ])->assertOk()
            ->assertJsonFragment(['message' => __('Assignments updated.')]);

        $this->assertGreaterThanOrEqual(2, $subject->fresh()->departmentRoles()->count());
    }

    public function test_admin_cannot_patch_own_status(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $this->actingAsSanctum($admin);

        $this->patchJson('/api/admin/users/'.$admin->id.'/status', [
            'status' => User::STATUS_SUSPENDED,
        ])->assertForbidden();
    }

    public function test_admin_can_suspend_another_user(): void
    {
        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $subject = User::factory()->create(['status' => User::STATUS_ACTIVE]);
        /** @var UserDepartmentRole $stub */
        $stub = $subject->departmentRoles()->create([
            'department_id' => Department::firstOrFail()->id,
            'role_id' => Role::firstOrFail()->id,
            'is_primary' => true,
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);
        unset($stub);

        $this->actingAsSanctum($admin);

        $this->patchJson('/api/admin/users/'.$subject->id.'/status', [
            'status' => User::STATUS_SUSPENDED,
        ])->assertOk()
            ->assertJsonPath('user.status', User::STATUS_SUSPENDED);
    }

    public function test_revoke_invitation_updates_row(): void
    {
        Mail::fake();

        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $guard = (string) config('permission.defaults.guard', 'web');
        $salesDept = Department::query()->where('slug', 'sales_marketing')->firstOrFail();
        $salesRole = Role::findByName('sales_representative', $guard)->id;

        $this->actingAsSanctum($admin);

        $this->postJson('/api/admin/users/invite', [
            'email' => 'soon-revoked@example.com',
            'department_id' => $salesDept->id,
            'role_id' => $salesRole,
        ])->assertCreated();

        /** @var UserInvitation $invitation */
        $invitation = UserInvitation::query()->where('email', 'soon-revoked@example.com')->firstOrFail();

        $this->postJson('/api/admin/invitations/'.$invitation->id.'/revoke')
            ->assertNoContent();

        $this->assertNotNull($invitation->fresh()->revoked_at);
    }

    public function test_resend_invite_for_invited_user(): void
    {
        Mail::fake();

        $admin = $this->userWithDepartmentRole('it', 'it_admin');
        $guard = (string) config('permission.defaults.guard', 'web');
        $salesDept = Department::query()->where('slug', 'sales_marketing')->firstOrFail();
        $salesRole = Role::findByName('sales_representative', $guard)->id;

        $this->actingAsSanctum($admin);

        $this->postJson('/api/admin/users/invite', [
            'email' => 'resend-me@example.com',
            'department_id' => $salesDept->id,
            'role_id' => $salesRole,
        ])->assertCreated();

        /** @var User $invitee */
        $invitee = User::query()->where('email', 'resend-me@example.com')->firstOrFail();

        Mail::assertSent(UserInvitedMail::class);

        Mail::fake();

        $this->postJson('/api/admin/users/'.$invitee->id.'/resend-invite')
            ->assertOk();

        Mail::assertSent(UserInvitedMail::class);
    }
}
