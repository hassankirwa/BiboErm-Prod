<?php

namespace App\Http\Requests\Warehouse\Offcuts;

use App\Enums\Warehouse\OffcutStorageArea;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LogOffcutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storageArea = $this->input('storage_area', OffcutStorageArea::WarehouseDeck->value);

        return [
            'item_id' => ['required', 'exists:warehouse_items,id'],
            'storage_area' => ['nullable', 'string', Rule::enum(OffcutStorageArea::class)],
            'bin_id' => [
                Rule::requiredIf($storageArea !== OffcutStorageArea::ProductionWorkspace->value),
                'nullable',
                'exists:warehouse_bins,id',
            ],
            'length_mm' => ['required', 'integer', 'min:1'],
            'quantity_pieces' => ['nullable', 'integer', 'min:1'],
            'source_project_id' => ['nullable', 'exists:projects,id'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
