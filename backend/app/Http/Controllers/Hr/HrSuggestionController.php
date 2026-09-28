<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrSuggestion;
use App\Models\User;
use App\Support\SharedAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HrSuggestionController extends Controller
{
    public function myStore(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $shared = SharedAccount::isShared($user);

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:3', 'max:5000'],
            'is_anonymous' => ['sometimes', 'boolean'],
            'employee_number' => ['nullable', 'string', 'max:50'],
        ]);

        $anonymous = (bool) ($validated['is_anonymous'] ?? false);

        $employeeNumber = isset($validated['employee_number'])
            ? strtoupper(trim((string) $validated['employee_number']))
            : null;
        if ($employeeNumber === '') {
            $employeeNumber = null;
        }

        if ($shared && ! $anonymous) {
            if ($employeeNumber === null) {
                throw ValidationException::withMessages([
                    'employee_number' => ['Employee number is required on shared accounts.'],
                ]);
            }

            if (SharedAccount::resolveEmployeeUserId($employeeNumber) === null) {
                throw ValidationException::withMessages([
                    'employee_number' => ['No employee found with that staff number.'],
                ]);
            }
        }

        if ($anonymous) {
            $employeeNumber = null;
        }

        $item = HrSuggestion::query()->create([
            'user_id' => $anonymous ? null : $user->id,
            'employee_number' => $employeeNumber,
            'is_anonymous' => $anonymous,
            'body' => $validated['body'],
            'status' => HrSuggestion::STATUS_OPEN,
        ]);

        return response()->json([
            'message' => __('Suggestion submitted.'),
            'data' => $this->serialize($item),
            'meta' => [
                'is_shared_account' => $shared,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = HrSuggestion::query()
            ->with(['user:id,name,email', 'reviewer:id,name'])
            ->latest();

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $items = $query->limit(200)->get()->map(fn (HrSuggestion $item) => $this->serialize($item, true));

        return response()->json(['data' => $items]);
    }

    public function updateStatus(HrSuggestion $hrSuggestion, Request $request): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(HrSuggestion::STATUSES)],
            'review_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $hrSuggestion->update([
            'status' => $validated['status'],
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'] ?? null,
        ]);

        return response()->json([
            'message' => __('Suggestion updated.'),
            'data' => $this->serialize($hrSuggestion->fresh(['user', 'reviewer']), true),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(HrSuggestion $item, bool $forHr = false): array
    {
        $payload = [
            'id' => $item->id,
            'is_anonymous' => (bool) $item->is_anonymous,
            'employee_number' => $forHr && ! $item->is_anonymous ? $item->employee_number : null,
            'body' => $item->body,
            'status' => $item->status,
            'reviewed_by' => $item->reviewed_by,
            'reviewer_name' => $item->reviewer?->name,
            'reviewed_at' => $item->reviewed_at?->toIso8601String(),
            'review_notes' => $item->review_notes,
            'created_at' => $item->created_at?->toIso8601String(),
        ];

        if ($forHr) {
            $payload['user_id'] = $item->is_anonymous ? null : $item->user_id;
            $payload['user_name'] = $item->is_anonymous ? null : $item->user?->name;
            $payload['user_email'] = $item->is_anonymous ? null : $item->user?->email;
        }

        return $payload;
    }
}
