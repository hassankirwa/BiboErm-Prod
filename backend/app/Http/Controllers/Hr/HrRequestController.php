<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\EmployeePayComponent;
use App\Models\HrRequest;
use App\Models\User;
use App\Support\SharedAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HrRequestController extends Controller
{
    public function myIndex(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $shared = SharedAccount::isShared($user);

        $items = HrRequest::query()
            ->where('user_id', $user->id)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (HrRequest $item) => $this->serialize($item, false, $shared));

        return response()->json([
            'data' => $items,
            'meta' => [
                'is_shared_account' => $shared,
            ],
        ]);
    }

    public function myStore(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $shared = SharedAccount::isShared($user);

        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(HrRequest::TYPES)],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'employee_number' => [$shared ? 'required' : 'nullable', 'string', 'max:50'],
        ]);

        if ($validated['type'] === HrRequest::TYPE_SALARY_ADVANCE && empty($validated['amount'])) {
            throw ValidationException::withMessages([
                'amount' => ['Amount is required for salary advances.'],
            ]);
        }

        $employeeNumber = isset($validated['employee_number'])
            ? strtoupper(trim((string) $validated['employee_number']))
            : null;

        if ($shared) {
            if ($employeeNumber === null || $employeeNumber === '') {
                throw ValidationException::withMessages([
                    'employee_number' => ['Employee number is required on shared accounts.'],
                ]);
            }

            if (SharedAccount::resolveEmployeeUserId($employeeNumber) === null) {
                throw ValidationException::withMessages([
                    'employee_number' => ['No employee found with that staff number.'],
                ]);
            }
        } elseif ($employeeNumber === '') {
            $employeeNumber = null;
        }

        $item = HrRequest::query()->create([
            'user_id' => $user->id,
            'employee_number' => $employeeNumber,
            'type' => $validated['type'],
            'amount' => $validated['amount'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => HrRequest::STATUS_PENDING,
        ]);

        return response()->json([
            'message' => __('Request submitted.'),
            'data' => $this->serialize($item, false, $shared),
            'meta' => [
                'is_shared_account' => $shared,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = HrRequest::query()
            ->with(['user:id,name,email', 'reviewer:id,name'])
            ->latest();

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $items = $query->limit(200)->get()->map(fn (HrRequest $item) => $this->serialize($item, true));

        return response()->json(['data' => $items]);
    }

    public function approve(HrRequest $hrRequest, Request $request): JsonResponse
    {
        if ($hrRequest->status !== HrRequest::STATUS_PENDING) {
            throw ValidationException::withMessages(['request' => ['Only pending requests can be approved.']]);
        }

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:2000'],
            'recover_from' => ['nullable', 'date'],
        ]);

        $hrRequest->update([
            'status' => HrRequest::STATUS_APPROVED,
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'] ?? null,
        ]);

        if ($hrRequest->type === HrRequest::TYPE_SALARY_ADVANCE && (float) $hrRequest->amount > 0) {
            $recoverUserId = SharedAccount::resolveEmployeeUserId($hrRequest->employee_number)
                ?? $hrRequest->user_id;

            EmployeePayComponent::query()->create([
                'user_id' => $recoverUserId,
                'kind' => EmployeePayComponent::KIND_DEDUCTION,
                'category' => EmployeePayComponent::CATEGORY_SALARY_ADVANCE,
                'label' => 'Salary advance recovery',
                'amount' => $hrRequest->amount,
                'is_recurring' => false,
                'effective_from' => $validated['recover_from'] ?? now()->toDateString(),
                'effective_to' => $validated['recover_from'] ?? now()->endOfMonth()->toDateString(),
                'reference' => 'hr_request:'.$hrRequest->id,
                'notes' => $hrRequest->notes,
                'created_by' => $actor->id,
            ]);
        }

        return response()->json([
            'message' => __('Request approved.'),
            'data' => $this->serialize($hrRequest->fresh(['user', 'reviewer']), true),
        ]);
    }

    public function reject(HrRequest $hrRequest, Request $request): JsonResponse
    {
        if ($hrRequest->status !== HrRequest::STATUS_PENDING) {
            throw ValidationException::withMessages(['request' => ['Only pending requests can be rejected.']]);
        }

        /** @var User $actor */
        $actor = $request->user();
        $validated = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $hrRequest->update([
            'status' => HrRequest::STATUS_REJECTED,
            'reviewed_by' => $actor->id,
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'] ?? null,
        ]);

        return response()->json([
            'message' => __('Request rejected.'),
            'data' => $this->serialize($hrRequest->fresh(['user', 'reviewer']), true),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(HrRequest $item, bool $includeUser = false, bool $hideAdvanceAmount = false): array
    {
        $isAdvance = $item->type === HrRequest::TYPE_SALARY_ADVANCE;
        $hideAmount = $hideAdvanceAmount && $isAdvance;

        return [
            'id' => $item->id,
            'user_id' => $item->user_id,
            'user_name' => $includeUser ? $item->user?->name : null,
            'user_email' => $includeUser ? $item->user?->email : null,
            'employee_number' => $item->employee_number,
            'type' => $item->type,
            'amount' => $hideAmount ? null : ($item->amount !== null ? (float) $item->amount : null),
            'amount_hidden' => $hideAmount,
            'notes' => $hideAmount ? null : $item->notes,
            'status' => $item->status,
            'reviewed_by' => $item->reviewed_by,
            'reviewer_name' => $item->reviewer?->name,
            'reviewed_at' => $item->reviewed_at?->toIso8601String(),
            'review_notes' => $item->review_notes,
            'created_at' => $item->created_at?->toIso8601String(),
        ];
    }
}
