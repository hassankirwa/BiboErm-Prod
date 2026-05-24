<?php

namespace App\Services\Profile;

use App\Models\ProfileChangeRequest;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\Audit\OwenAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProfileChangeRequestService
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function submit(User $user, array $changes, ?string $userNote = null): ProfileChangeRequest
    {
        if ($user->status !== User::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'profile' => [__('Profile change requests are only available for active accounts.')],
            ]);
        }

        $existing = ProfileChangeRequest::query()
            ->where('user_id', $user->id)
            ->where('status', ProfileChangeRequest::STATUS_PENDING)
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'profile' => [__('You already have a pending profile change request.')],
            ]);
        }

        /** @var UserProfile $profile */
        $profile = UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $filtered = $this->filterChanges($changes);

        if ($filtered === []) {
            throw ValidationException::withMessages([
                'profile' => [__('No profile changes were submitted.')],
            ]);
        }

        $previous = [];
        foreach (array_keys($filtered) as $field) {
            $previous[$field] = $profile->{$field};
        }

        if ($previous === $filtered) {
            throw ValidationException::withMessages([
                'profile' => [__('Submitted values match your current profile.')],
            ]);
        }

        $request = ProfileChangeRequest::query()->create([
            'user_id' => $user->id,
            'requested_changes' => $filtered,
            'previous_values' => $previous,
            'status' => ProfileChangeRequest::STATUS_PENDING,
            'user_note' => $userNote,
        ]);

        $this->audit->log(
            module: 'profile',
            action: 'change_request_submitted',
            entityType: 'profile_change_request',
            entityId: $request->id,
            newValues: ['requested_changes' => $filtered],
        );

        return $request;
    }

    public function approve(ProfileChangeRequest $request, User $reviewer): ProfileChangeRequest
    {
        if ($request->status !== ProfileChangeRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'request' => [__('This profile change request is no longer pending.')],
            ]);
        }

        return DB::transaction(function () use ($request, $reviewer) {
            /** @var User $subject */
            $subject = User::query()->findOrFail($request->user_id);

            /** @var UserProfile $profile */
            $profile = UserProfile::query()->firstOrCreate(['user_id' => $request->user_id]);

            $changes = $request->requested_changes ?? [];
            $profileChanges = [];
            $userChanges = [];

            foreach ($changes as $field => $value) {
                if (in_array($field, ProfileChangeRequest::IDENTITY_FIELDS, true)) {
                    $userChanges[$field] = $value;
                } elseif (in_array($field, ProfileChangeRequest::PROFILE_FIELDS, true)) {
                    $profileChanges[$field] = $value;
                }
            }

            $oldProfile = $profile->only(array_keys($profileChanges));
            $oldUser = $subject->only(array_keys($userChanges));

            if ($profileChanges !== []) {
                $profile->fill($profileChanges)->save();
            }

            if ($userChanges !== []) {
                if (isset($userChanges['email'])) {
                    $userChanges['email'] = mb_strtolower(trim((string) $userChanges['email']));

                    if ($userChanges['email'] !== $subject->email) {
                        $userChanges['email_verified_at'] = null;
                    }
                }

                if (isset($userChanges['name'])) {
                    $userChanges['name'] = trim((string) $userChanges['name']);
                }

                $subject->forceFill($userChanges)->save();
            }

            $request->forceFill([
                'status' => ProfileChangeRequest::STATUS_APPROVED,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ])->save();

            $this->audit->log(
                module: 'profile',
                action: 'change_request_approved',
                entityType: 'profile_change_request',
                entityId: $request->id,
                oldValues: array_filter([
                    ...$oldProfile,
                    ...$oldUser,
                ]) ?: null,
                newValues: $changes,
            );

            return $request->fresh(['user', 'reviewer']);
        });
    }

    public function reject(ProfileChangeRequest $request, User $reviewer, ?string $reason = null): ProfileChangeRequest
    {
        if ($request->status !== ProfileChangeRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'request' => [__('This profile change request is no longer pending.')],
            ]);
        }

        $request->forceFill([
            'status' => ProfileChangeRequest::STATUS_REJECTED,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
            'rejection_reason' => $reason,
        ])->save();

        $this->audit->log(
            module: 'profile',
            action: 'change_request_rejected',
            entityType: 'profile_change_request',
            entityId: $request->id,
            newValues: ['rejection_reason' => $reason],
        );

        return $request->fresh(['user', 'reviewer']);
    }

    public function pendingForUser(int $userId): ?ProfileChangeRequest
    {
        return ProfileChangeRequest::query()
            ->where('user_id', $userId)
            ->where('status', ProfileChangeRequest::STATUS_PENDING)
            ->latest('id')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    private function filterChanges(array $changes): array
    {
        $filtered = [];

        foreach (ProfileChangeRequest::REQUESTABLE_FIELDS as $field) {
            if (! array_key_exists($field, $changes)) {
                continue;
            }

            $value = $changes[$field];

            if ($value === null || $value === '') {
                continue;
            }

            $filtered[$field] = $value;
        }

        return $filtered;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function serialize(?ProfileChangeRequest $request): ?array
    {
        if (! $request) {
            return null;
        }

        return [
            'id' => $request->id,
            'status' => $request->status,
            'requested_changes' => $request->requested_changes,
            'previous_values' => $request->previous_values,
            'user_note' => $request->user_note,
            'rejection_reason' => $request->rejection_reason,
            'created_at' => $request->created_at?->toIso8601String(),
            'reviewed_at' => $request->reviewed_at?->toIso8601String(),
        ];
    }
}
