<?php

namespace App\Http\Requests\Production;

use App\Enums\Production\ProductionStage;
use App\Enums\Warehouse\OffcutStorageArea;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
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

        if (is_string($offcuts)) {
            $decoded = json_decode($offcuts, true);
            $offcuts = is_array($decoded) ? $decoded : [];
        }

        if (! is_array($offcuts)) {
            $offcuts = [];
        }

        foreach ($offcuts as $index => $offcut) {
            if (! is_array($offcut)) {
                continue;
            }
            if (! isset($offcut['storage_area'])) {
                $offcuts[$index]['storage_area'] = OffcutStorageArea::ProductionWorkspace->value;
            }
        }

        $discardIds = $this->input('discard_waste_line_ids', []);
        if (is_string($discardIds)) {
            $decodedDiscard = json_decode($discardIds, true);
            $discardIds = is_array($decodedDiscard) ? $decodedDiscard : [];
        }
        if (! is_array($discardIds)) {
            $discardIds = [];
        }

        $this->merge([
            'offcuts' => $offcuts,
            'discard_waste_line_ids' => array_values(array_map('intval', $discardIds)),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $stage = $this->input('stage');
        $notesRequired = in_array($stage, [
            ProductionStage::MaterialPrep->value,
            ProductionStage::Fabrication->value,
            ProductionStage::Sash->value,
        ], true);

        $singleEvidence = $this->hasFile('evidence') && ! is_array($this->file('evidence'));

        return [
            'stage' => ['required', 'string', Rule::enum(ProductionStage::class)],
            'notes' => [$notesRequired ? 'required' : 'nullable', 'string', 'min:1'],
            'evidence' => $singleEvidence
                ? ['nullable', 'file', 'image', 'max:10240', 'mimes:jpg,jpeg,png,webp']
                : ['nullable', 'array', 'max:8'],
            'evidence.*' => ['file', 'image', 'max:10240', 'mimes:jpg,jpeg,png,webp'],
            'offcuts' => ['nullable', 'array'],
            'offcuts.*.item_id' => ['required_with:offcuts', 'integer', 'exists:warehouse_items,id'],
            'offcuts.*.storage_area' => ['nullable', 'string', Rule::enum(OffcutStorageArea::class)],
            'offcuts.*.bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
            'offcuts.*.length_mm' => ['required_with:offcuts', 'integer', 'min:1'],
            'offcuts.*.quantity_pieces' => ['nullable', 'integer', 'min:1'],
            'offcuts.*.notes' => ['nullable', 'string'],
            'discard_waste_line_ids' => ['nullable', 'array'],
            'discard_waste_line_ids.*' => ['integer', 'exists:cutting_sheets,id'],
        ];
    }

    public function stage(): ProductionStage
    {
        return ProductionStage::from($this->validated('stage'));
    }

    /**
     * @return list<UploadedFile>
     */
    public function evidenceFiles(): array
    {
        $files = $this->file('evidence');

        if ($files instanceof UploadedFile) {
            return [$files];
        }

        if (! is_array($files)) {
            return [];
        }

        return array_values(array_filter(
            $files,
            fn ($file) => $file instanceof UploadedFile,
        ));
    }

    /** @deprecated Use evidenceFiles() */
    public function evidenceFile(): ?UploadedFile
    {
        return $this->evidenceFiles()[0] ?? null;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'notes.required' => 'Notes are required before closing this stage.',
        ];
    }
}
