<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\EmployeePayComponent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeePayComponentController extends Controller
{
    public function index(User $user): JsonResponse
    {
        $components = EmployeePayComponent::query()
            ->where('user_id', $user->id)
            ->orderByDesc('is_recurring')
            ->orderBy('kind')
            ->orderBy('id')
            ->get()
            ->map(fn (EmployeePayComponent $component) => $this->serialize($component));

        return response()->json(['data' => $components]);
    }

    public function store(User $user, Request $request): JsonResponse
    {
        $validated = $this->validated($request);
        /** @var User $actor */
        $actor = $request->user();

        $component = EmployeePayComponent::query()->create([
            ...$validated,
            'user_id' => $user->id,
            'created_by' => $actor->id,
        ]);

        return response()->json([
            'message' => __('Pay component saved.'),
            'data' => $this->serialize($component),
        ], 201);
    }

    public function update(User $user, EmployeePayComponent $payComponent, Request $request): JsonResponse
    {
        if ($payComponent->user_id !== $user->id) {
            abort(404);
        }

        $payComponent->fill($this->validated($request, updating: true))->save();

        return response()->json([
            'message' => __('Pay component updated.'),
            'data' => $this->serialize($payComponent->fresh()),
        ]);
    }

    public function destroy(User $user, EmployeePayComponent $payComponent): JsonResponse
    {
        if ($payComponent->user_id !== $user->id) {
            abort(404);
        }

        $payComponent->delete();

        return response()->json(['message' => __('Pay component deleted.')]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, bool $updating = false): array
    {
        $kind = $request->input('kind');
        $categories = match ($kind) {
            EmployeePayComponent::KIND_ADDITION => EmployeePayComponent::ADDITION_CATEGORIES,
            EmployeePayComponent::KIND_DEDUCTION => EmployeePayComponent::DEDUCTION_CATEGORIES,
            default => array_merge(
                EmployeePayComponent::ADDITION_CATEGORIES,
                EmployeePayComponent::DEDUCTION_CATEGORIES,
            ),
        };

        $rules = [
            'kind' => [$updating ? 'sometimes' : 'required', 'string', Rule::in(EmployeePayComponent::KINDS)],
            'category' => [$updating ? 'sometimes' : 'required', 'string', Rule::in($categories)],
            'label' => ['nullable', 'string', 'max:120'],
            'amount' => [$updating ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'is_recurring' => ['sometimes', 'boolean'],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];

        return $request->validate($rules);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(EmployeePayComponent $component): array
    {
        return [
            'id' => $component->id,
            'user_id' => $component->user_id,
            'kind' => $component->kind,
            'category' => $component->category,
            'label' => $component->label,
            'amount' => (float) $component->amount,
            'is_recurring' => (bool) $component->is_recurring,
            'effective_from' => $component->effective_from?->toDateString(),
            'effective_to' => $component->effective_to?->toDateString(),
            'reference' => $component->reference,
            'notes' => $component->notes,
            'created_by' => $component->created_by,
            'created_at' => $component->created_at?->toIso8601String(),
        ];
    }
}
