<?php

namespace App\Http\Requests\Production;

use App\Enums\Production\ProductionStage;
use App\Enums\Warehouse\OffcutStorageArea;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompleteStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $offcuts = $this->input('offcuts', []);

        foreach ($offcuts as $index => $offcut) {
            if (! isset($offcut['storage_area'])) {
                $offcuts[$index]['storage_area'] = OffcutStorageArea::ProductionWorkspace->value;
            }
        }

        $this->merge(['offcuts' => $offcuts]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'stage' => ['required', 'string', Rule::enum(ProductionStage::class)],
            'notes' => ['nullable', 'string'],
            'offcuts' => ['nullable', 'array'],
            'offcuts.*.item_id' => ['required_with:offcuts', 'integer', 'exists:warehouse_items,id'],
            'offcuts.*.storage_area' => ['nullable', 'string', Rule::enum(OffcutStorageArea::class)],
            'offcuts.*.bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
            'offcuts.*.length_mm' => ['required_with:offcuts', 'integer', 'min:1'],
            'offcuts.*.quantity_pieces' => ['nullable', 'integer', 'min:1'],
            'offcuts.*.notes' => ['nullable', 'string'],
        ];
    }

    public function stage(): ProductionStage
    {
        return ProductionStage::from($this->validated('stage'));
    }
}
