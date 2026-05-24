<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\SubmitProfileChangeRequestRequest;
use App\Models\ProfileChangeRequest;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\Audit\OwenAuditLogger;
use App\Services\Profile\ProfileChangeRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ProfileChangeRequestController extends Controller
{
    public function __construct(
        private readonly OwenAuditLogger $audit,
    ) {}

    public function store(SubmitProfileChangeRequestRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

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

        $validated = $request->validated();
        $userNote = $validated['user_note'] ?? null;
        unset($validated['user_note']);

        /** @var UserProfile $profile */
        $profile = UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $filtered = [];
        $previous = [];

        foreach (ProfileChangeRequest::PROFILE_FIELDS as $field) {
            if (! array_key_exists($field, $validated)) {
                continue;
            }

            $newValue = $validated[$field];
            $currentValue = $profile->{$field};

            if ($newValue != $currentValue) {
                $filtered[$field] = $newValue;
                $previous[$field] = $currentValue;
            }
        }

        foreach (ProfileChangeRequest::IDENTITY_FIELDS as $field) {
            if (! array_key_exists($field, $validated)) {
                continue;
            }

            $newValue = $field === 'email'
                ? mb_strtolower(trim((string) $validated[$field]))
                : trim((string) $validated[$field]);

            if ($newValue === '') {
                continue;
            }

            $currentValue = $field === 'email'
                ? mb_strtolower((string) $user->email)
                : $user->{$field};

            if ($newValue != $currentValue) {
                $filtered[$field] = $newValue;
                $previous[$field] = $user->{$field};
            }
        }

        if ($filtered === []) {
            throw ValidationException::withMessages([
                'profile' => [__('Submitted values match your current profile.')],
            ]);
        }

        $changeRequest = ProfileChangeRequest::query()->create([
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
            entityId: $changeRequest->id,
            newValues: ['requested_changes' => $filtered],
        );

        return response()->json([
            'message' => __('Profile change request submitted for HR review.'),
            'change_request' => ProfileChangeRequestService::serialize($changeRequest),
        ], 201);
    }
}
