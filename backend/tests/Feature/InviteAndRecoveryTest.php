<?php

namespace Tests\Feature;

use App\Mail\EmailRecoveryMail;
use App\Mail\PasswordResetRequestedMail;
use App\Mail\UserInvitedMail;
use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Spatie\Permission\Models\Role;
use Tests\Support\InteractsWithSeededApplication;

class InviteAndRecoveryTest extends FeatureTestCase
{
    use InteractsWithSeededApplication;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedApplication();
    }

    public function test_accept_invite_rejects_bad_token(): void
    {
        $this->postJsonStateful('/api/auth/accept-invite', [
            'token' => 'not-real',
            'password' => 'NewPassword11!',
            'password_confirmation' => 'NewPassword11!',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['token']);
    }

    public function test_accept_invite_succeeds_for_valid_invitation(): void
    {
        Mail::fake();

        $actor = $this->userWithDepartmentRole('it', 'it_admin');

        $salesDept = \App\Models\Department::query()->where('slug', 'sales_marketing')->firstOrFail();
        $roleId = Role::findByName('sales_representative', (string) config('permission.defaults.guard', 'web'))->id;
        $response = $this->actingAsSanctum($actor)->postJson('/api/admin/users/invite', [
            'email' => 'invite-success@example.com',
            'name' => 'Invited Person',
            'department_id' => $salesDept->id,
            'role_id' => $roleId,
            'additional_assignments' => [],
        ]);
        $response->assertCreated();

        Mail::assertSent(UserInvitedMail::class);

        /** @var string|null $token */
        $token = null;
        Mail::assertSent(UserInvitedMail::class, function (UserInvitedMail $mailable) use (&$token): bool {
            $token = $mailable->plainInviteToken;

            return true;
        });
        $this->assertNotNull($token);

        $accept = $this->postJsonStateful('/api/auth/accept-invite', [
            'token' => $token,
            'password' => 'AcceptedPass11!',
            'password_confirmation' => 'AcceptedPass11!',
        ]);
        $accept->assertOk()
            ->assertJsonPath('user.status', User::STATUS_PENDING_PROFILE_COMPLETION);
    }

    public function test_forgot_password_queues_reset_mail_when_user_exists(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'reset-target@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk()
            ->assertJsonFragment([
                'message' => __('If that email exists, we sent a reset link.'),
            ]);

        Mail::assertQueued(PasswordResetRequestedMail::class);
    }

    public function test_reset_password_updates_password_via_broker_token(): void
    {
        $user = User::factory()->create(['email' => 'reset-me@example.com']);

        /** @phpstan-ignore-next-line */
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'FreshPassWord1!',
            'password_confirmation' => 'FreshPassWord1!',
        ])->assertOk()
            ->assertJsonFragment([
                'message' => __('Password reset successfully.'),
            ]);

        $this->postJsonStateful('/api/auth/login', [
            'email' => $user->email,
            'password' => 'FreshPassWord1!',
        ])->assertOk();
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->create(['email' => 'bad-token@example.com']);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => 'invalid-token',
            'password' => 'FreshPassWord1!',
            'password_confirmation' => 'FreshPassWord1!',
        ])->assertUnprocessable()->assertInvalid(['token']);
    }

    public function test_recover_email_mails_matching_employee_numbers(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'hidden@example.com']);
        EmployeeProfile::query()->create([
            'user_id' => $user->id,
            'employee_number' => 'EMP123',
        ]);

        $this->postJson('/api/auth/recover-email', [
            'employee_number' => '  EMP123  ',
        ])->assertOk();

        Mail::assertQueued(EmailRecoveryMail::class, function (EmailRecoveryMail $mail): bool {
            return $mail->emailAddress === 'hidden@example.com';
        });
    }
}
