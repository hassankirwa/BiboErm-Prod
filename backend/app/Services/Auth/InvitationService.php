<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Models\UserInvitation;
use App\Models\UserProfile;
use App\Mail\UserInvitedMail;
use App\Services\Audit\OwenAuditLogger;
use App\Support\DepartmentRoleAssignmentRules;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvitationService
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
    ) {}

    /**
     * @param  array<int, array{department_id: int, role_id: int}>  $additionalAssignments
     */
    public function createInvitation(
        string $email,
        ?string $name,
        int $departmentId,
        int $roleId,
        array $additionalAssignments,
        User $invitedBy,
    ): User {
        $email = mb_strtolower(trim($email));

        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => ['A user with this email already exists.']]);
        }

        DepartmentRoleAssignmentRules::validate($departmentId, $roleId, $additionalAssignments);

        return DB::transaction(function () use ($email, $name, $departmentId, $roleId, $additionalAssignments, $invitedBy) {
            $tempPasswordPlain = Str::password(18);

            $user = User::query()->create([
                'name' => $name ?? Str::before($email, '@'),
                'email' => $email,
                'password' => Hash::make($tempPasswordPlain),
                'status' => User::STATUS_INVITED,
                'invited_by' => $invitedBy->id,
                'must_change_password' => true,
                'email_verified_at' => null,
                'onboarding_completed_at' => null,
            ]);

            UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

            $assignmentRows = [];
            $seen = [];
            $primaryKey = $departmentId.'-'.$roleId;
            $seen[$primaryKey] = true;
            $assignmentRows[] = [
                'department_id' => $departmentId,
                'role_id' => $roleId,
                'is_primary' => true,
            ];

            foreach ($additionalAssignments as $row) {
                $k = ((int) $row['department_id']).'-'.((int) $row['role_id']);
                if (isset($seen[$k])) {
                    continue;
                }

                $seen[$k] = true;
                $assignmentRows[] = [
                    'department_id' => (int) $row['department_id'],
                    'role_id' => (int) $row['role_id'],
                    'is_primary' => false,
                ];
            }

            foreach ($assignmentRows as $row) {
                UserDepartmentRole::query()->firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'department_id' => $row['department_id'],
                        'role_id' => $row['role_id'],
                    ],
                    [
                        'is_primary' => $row['is_primary'],
                        'assigned_by' => $invitedBy->id,
                        'assigned_at' => now(),
                    ]
                );
            }

            UserDepartmentRole::query()->where('user_id', $user->id)->update(['is_primary' => false]);
            UserDepartmentRole::query()
                ->where('user_id', $user->id)
                ->where('department_id', $departmentId)
                ->where('role_id', $roleId)
                ->update(['is_primary' => true]);

            $plainToken = Str::random(64);
            $tokenHash = hash('sha256', $plainToken);

            $hours = (int) config('bibo.invite.expire_hours', 72);

            $invitation = UserInvitation::query()->create([
                'user_id' => $user->id,
                'email' => $email,
                'name' => $name,
                'department_id' => $departmentId,
                'role_id' => $roleId,
                'token_hash' => $tokenHash,
                'invited_by' => $invitedBy->id,
                'expires_at' => Carbon::now()->addHours($hours),
            ]);

            Mail::to($email)->queue(new UserInvitedMail($user, $plainToken, $tempPasswordPlain, $invitation));

            $this->audit->log(
                module: 'users',
                action: 'invite',
                entityType: 'user',
                entityId: $user->id,
                newValues: [
                    'email' => $email,
                    'status' => User::STATUS_INVITED,
                    'department_id' => $departmentId,
                    'role_id' => $roleId,
                    'invitation_id' => $invitation->id,
                ]
            );

            return $user;
        });
    }

    public function acceptInvitation(string $plainToken, string $password): User
    {
        $hash = hash('sha256', $plainToken);

        /** @var UserInvitation|null $invitation */
        $invitation = UserInvitation::query()
            ->with('user')
            ->where('token_hash', $hash)
            ->first();

        if (! $invitation || ! $invitation->isUsable()) {
            throw ValidationException::withMessages(['token' => ['Invitation is invalid, expired, or already used.']]);
        }

        $user = $invitation->user;

        return DB::transaction(function () use ($invitation, $user, $password) {
            $invitation->update(['accepted_at' => now()]);

            $user->password = Hash::make($password);
            $user->email_verified_at = now();
            $user->status = User::STATUS_PENDING_PROFILE_COMPLETION;
            $user->must_change_password = false;
            $user->save();

            $this->audit->log(
                module: 'auth',
                action: 'invite_accepted',
                entityType: 'user',
                entityId: $user->id,
                newValues: ['email' => $user->email, 'invitation_id' => $invitation->id],
            );

            return $user->fresh([
                'profile',
                'departmentRoles.department',
            ]);
        });
    }

    public function revokeInvitation(UserInvitation $invitation): void
    {
        if ($invitation->accepted_at !== null) {
            throw ValidationException::withMessages(['invitation' => ['Invitation was already accepted.']]);
        }

        if ($invitation->revoked_at !== null) {
            return;
        }

        $invitation->forceFill([
            'revoked_at' => now(),
        ])->save();

        $this->audit->log(
            module: 'users',
            action: 'revoke_invite',
            entityType: 'user_invitation',
            entityId: $invitation->id,
            newValues: ['user_id' => $invitation->user_id],
        );
    }

    public function resendForUser(User $user, User $invitedBy): void
    {
        if ($user->status !== User::STATUS_INVITED) {
            throw ValidationException::withMessages(['user' => ['User is not awaiting invitation acceptance.']]);
        }

        DB::transaction(function () use ($user, $invitedBy) {
            UserInvitation::query()
                ->where('user_id', $user->id)
                ->whereNull('accepted_at')
                ->update(['revoked_at' => now()]);

            $tempPasswordPlain = Str::password(18);
            $user->password = Hash::make($tempPasswordPlain);
            $user->must_change_password = true;
            $user->save();

            $primary = UserDepartmentRole::query()
                ->where('user_id', $user->id)
                ->where('is_primary', true)
                ->first();

            if (! $primary) {
                throw ValidationException::withMessages(['user' => ['User has no primary department assignment.']]);
            }

            $plainToken = Str::random(64);
            $tokenHash = hash('sha256', $plainToken);
            $hours = (int) config('bibo.invite.expire_hours', 72);

            $invitation = UserInvitation::query()->create([
                'user_id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'department_id' => $primary->department_id,
                'role_id' => $primary->role_id,
                'token_hash' => $tokenHash,
                'invited_by' => $invitedBy->id,
                'expires_at' => Carbon::now()->addHours($hours),
            ]);

            Mail::to($user->email)->queue(new UserInvitedMail($user, $plainToken, $tempPasswordPlain, $invitation));

            $this->audit->log(
                module: 'users',
                action: 'resend_invite',
                entityType: 'user',
                entityId: $user->id,
                newValues: ['invitation_id' => $invitation->id],
            );
        });
    }
}
