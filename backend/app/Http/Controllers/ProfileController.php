<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\AvatarUploadRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Media\AvatarStorageService;
use App\Services\Profile\ProfileChangeRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
        private readonly AvatarStorageService $avatars,
    ) {}

    public function show(): JsonResponse
    {
        /** @var User $user */
        $user = request()->user();

        /** @var UserProfile $profile */
        $profile = UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $user->loadMissing('employeeProfile');

        $pendingRequest = app(ProfileChangeRequestService::class)->pendingForUser($user->id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'two_factor_enabled' => (bool) $user->two_factor_enabled,
                'status' => $user->status,
            ],
            'profile' => $this->profilePayload($profile),
            'employee_number' => $user->employeeProfile?->employee_number,
            'pending_change_request' => ProfileChangeRequestService::serialize($pendingRequest),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function profilePayload(UserProfile $profile): array
    {
        $profile = $profile->fresh();

        return [
            'id' => $profile->id,
            'user_id' => $profile->user_id,
            'phone' => $profile->phone,
            'avatar_url' => $profile->avatar_url,
            'avatar_path' => $profile->avatar_path,
            'gender' => $profile->gender,
            'address' => $profile->address,
            'emergency_contact_name' => $profile->emergency_contact_name,
            'emergency_contact_phone' => $profile->emergency_contact_phone,
            'emergency_contact_relationship' => $profile->emergency_contact_relationship,
            'preferences' => $profile->preferences,
            'created_at' => $profile->created_at,
            'updated_at' => $profile->updated_at,
        ];
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->status === User::STATUS_ACTIVE) {
            throw ValidationException::withMessages([
                'profile' => [__('Submit a profile change request from Settings to update your information.')],
            ]);
        }

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

        return response()->json(['message' => __('Profile saved.'), 'profile' => $this->profilePayload($profile->fresh())]);
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
            'profile' => $this->profilePayload($profile->fresh()),
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
