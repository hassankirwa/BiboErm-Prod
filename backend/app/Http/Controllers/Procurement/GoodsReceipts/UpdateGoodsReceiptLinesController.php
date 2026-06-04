<?php

namespace App\Http\Controllers\Procurement\GoodsReceipts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GoodsReceiptResource;
use App\Models\Procurement\GoodsReceipt;
use App\Services\Procurement\GoodsReceipts\GoodsReceiptService;
use Illuminate\Http\Request;

class UpdateGoodsReceiptLinesController extends Controller
{
    public function __construct(protected GoodsReceiptService $service) {}

    public function __invoke(Request $request, GoodsReceipt $goodsReceipt): GoodsReceiptResource
    {
        $this->authorize('update', $goodsReceipt);

        $validated = $request->validate([
            'lines' => ['nullable', 'array'],
            'lines.*.id' => ['required', 'integer'],
            'lines.*.qty_received' => ['required', 'numeric', 'min:0'],
            'lines.*.qty_accepted' => ['nullable', 'numeric', 'min:0'],
            'lines.*.qty_rejected' => ['nullable', 'numeric', 'min:0'],
            'lines.*.rejection_reason' => ['nullable', 'string'],
            'lines.*.to_bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
            'lines.*.warehouse_item_id' => ['nullable', 'integer', 'exists:warehouse_items,id'],
            'lines.*.notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'quality_inspection_notes' => ['nullable', 'string'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
        ]);

        if (
            ($validated['lines'] ?? []) === []
            && ! array_key_exists('notes', $validated)
            && ! array_key_exists('quality_inspection_notes', $validated)
            && ! array_key_exists('project_id', $validated)
        ) {
            return response()->json([
                'message' => 'Provide at least one line update or GRN notes / project link.',
            ], 422);
        }

        $header = [];

        if (array_key_exists('notes', $validated)) {
            $header['notes'] = $validated['notes'];
        }

        if (array_key_exists('quality_inspection_notes', $validated)) {
            $header['quality_inspection_notes'] = $validated['quality_inspection_notes'];
        }

        if (array_key_exists('project_id', $validated)) {
            $header['project_id'] = $validated['project_id'];
        }

        return new GoodsReceiptResource($this->service->loadForApi(
            $this->service->updateLines($goodsReceipt, $validated['lines'] ?? [], $header),
        ));
    }
}
