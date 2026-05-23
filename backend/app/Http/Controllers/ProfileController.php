<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\AvatarUploadRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Media\AvatarStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
        private readonly AvatarStorageService $avatars,
    ) {}

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var UserProfile $profile */
        $profile = UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $data = collect($request->validated())->reject(fn (?string $value): bool => $value === null)->all();

        $old = [];

        foreach (array_keys($data) as $key) {
            $old[$key] = $profile->{$key};
        }

        $profile->fill($data)->save();

        $this->audit->log(
            module: 'profile',
            action: 'update',
            entityType: 'user_profile',
            entityId: $profile->id,
            oldValues: $old ?: null,
            newValues: $profile->only(array_keys($data)),
        );

        if ($user->status === User::STATUS_PENDING_PROFILE_COMPLETION && $this->profileMinimumFilled($profile->fresh())) {
            $user->forceFill([
                'onboarding_completed_at' => now(),
                'status' => User::STATUS_PENDING_HR_REVIEW,
            ])->save();
        }

        return response()->json(['message' => __('Profile saved.'), 'profile' => $profile->fresh()]);
    }

    public function avatar(AvatarUploadRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var UserProfile $profile */
        $profile = UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $path = DB::transaction(function () use ($request, $profile, $user) {
            $previous = $profile->avatar_path;
            $stored = $this->avatars->store($request->file('avatar'), $user);
            $this->avatars->deleteIfExists($previous);
            $profile->forceFill([
                'avatar_path' => $stored['path'],
                'avatar_url' => $stored['url'],
            ])->save();

            return $stored;
        });

        $this->audit->log(
            module: 'profile',
            action: 'avatar_upload',
            entityType: 'user_profile',
            entityId: $profile->id,
            newValues: ['avatar_path' => $path['path']],
        );

        return response()->json([
            'message' => __('Avatar uploaded.'),
            'avatar_path' => $path['path'],
            'avatar_url' => $path['url'],
        ]);
    }

    private function profileMinimumFilled(UserProfile $profile): bool
    {
        $requiredFilled = filled($profile->phone)
            && filled($profile->emergency_contact_name)
            && filled($profile->emergency_contact_phone);

        return $requiredFilled;
    }
}
