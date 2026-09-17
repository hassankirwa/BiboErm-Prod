<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\PayrollDeductionType;
use App\Models\PayrollSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PayrollSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = PayrollSetting::current();
        $deductions = PayrollDeductionType::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'settings' => [
                    'id' => $settings->id,
                    'nssf_tier1_cap' => (float) $settings->nssf_tier1_cap,
                    'nssf_tier2_cap' => (float) $settings->nssf_tier2_cap,
                    'nssf_rate' => (float) $settings->nssf_rate,
                    'personal_relief' => (float) $settings->personal_relief,
                    'annual_leave_days' => (int) ($settings->annual_leave_days ?? 21),
                    'paye_bands' => $settings->paye_bands ?? [],
                ],
                'deduction_types' => $deductions->map(fn (PayrollDeductionType $type) => $this->serializeType($type))->values(),
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nssf_tier1_cap' => ['sometimes', 'numeric', 'min:0'],
            'nssf_tier2_cap' => ['sometimes', 'numeric', 'min:0'],
            'nssf_rate' => ['sometimes', 'numeric', 'min:0', 'max:1'],
            'personal_relief' => ['sometimes', 'numeric', 'min:0'],
            'annual_leave_days' => ['sometimes', 'integer', 'min:0', 'max:365'],
            'paye_bands' => ['sometimes', 'array'],
            'paye_bands.*.min' => ['required_with:paye_bands', 'numeric', 'min:0'],
            'paye_bands.*.max' => ['required_with:paye_bands', 'numeric', 'min:0'],
            'paye_bands.*.rate' => ['required_with:paye_bands', 'numeric', 'min:0', 'max:1'],
        ]);

        $settings = PayrollSetting::current();
        $settings->fill($validated)->save();

        return $this->show();
    }

    public function storeDeductionType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:50', 'alpha_dash', 'unique:payroll_deduction_types,code'],
            'method' => ['required', 'string', Rule::in([
                PayrollDeductionType::METHOD_PERCENT_OF_GROSS,
                PayrollDeductionType::METHOD_FIXED,
            ])],
            'rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'tax_deductible' => ['sometimes', 'boolean'],
            'enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);

        if ($validated['method'] === PayrollDeductionType::METHOD_PERCENT_OF_GROSS && ! isset($validated['rate'])) {
            throw ValidationException::withMessages(['rate' => ['Rate is required for percent deductions.']]);
        }
        if ($validated['method'] === PayrollDeductionType::METHOD_FIXED && ! isset($validated['amount'])) {
            throw ValidationException::withMessages(['amount' => ['Amount is required for fixed deductions.']]);
        }

        $code = $validated['code'] ?? Str::slug($validated['name'], '_');
        if ($code === '') {
            $code = 'custom_'.Str::lower(Str::random(6));
        }

        $type = PayrollDeductionType::query()->create([
            'code' => $code,
            'name' => $validated['name'],
            'method' => $validated['method'],
            'rate' => $validated['rate'] ?? null,
            'amount' => $validated['amount'] ?? null,
            'tax_deductible' => (bool) ($validated['tax_deductible'] ?? false),
            'enabled' => (bool) ($validated['enabled'] ?? true),
            'is_system' => false,
            'sort_order' => (int) ($validated['sort_order'] ?? 100),
        ]);

        return response()->json([
            'message' => __('Deduction type created.'),
            'data' => $this->serializeType($type),
        ], 201);
    }

    public function updateDeductionType(PayrollDeductionType $deductionType, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'method' => ['sometimes', 'string', Rule::in([
                PayrollDeductionType::METHOD_PERCENT_OF_GROSS,
                PayrollDeductionType::METHOD_FIXED,
                PayrollDeductionType::METHOD_NSSF_TIERED,
                PayrollDeductionType::METHOD_PAYE_BANDS,
            ])],
            'rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'tax_deductible' => ['sometimes', 'boolean'],
            'enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);

        if ($deductionType->is_system) {
            unset($validated['method']);
        }

        $deductionType->fill($validated)->save();

        return response()->json([
            'message' => __('Deduction type updated.'),
            'data' => $this->serializeType($deductionType->fresh()),
        ]);
    }

    public function destroyDeductionType(PayrollDeductionType $deductionType): JsonResponse
    {
        if ($deductionType->is_system) {
            throw ValidationException::withMessages([
                'deduction' => [__('System deduction types cannot be deleted. Disable them instead.')],
            ]);
        }

        $deductionType->delete();

        return response()->json(['message' => __('Deduction type deleted.')]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeType(PayrollDeductionType $type): array
    {
        return [
            'id' => $type->id,
            'code' => $type->code,
            'name' => $type->name,
            'method' => $type->method,
            'rate' => $type->rate !== null ? (float) $type->rate : null,
            'amount' => $type->amount !== null ? (float) $type->amount : null,
            'tax_deductible' => (bool) $type->tax_deductible,
            'enabled' => (bool) $type->enabled,
            'is_system' => (bool) $type->is_system,
            'sort_order' => (int) $type->sort_order,
        ];
    }
}
