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
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.id' => ['required', 'integer'],
            'lines.*.qty_received' => ['required', 'numeric', 'min:0'],
            'lines.*.qty_accepted' => ['nullable', 'numeric', 'min:0'],
            'lines.*.qty_rejected' => ['nullable', 'numeric', 'min:0'],
            'lines.*.rejection_reason' => ['nullable', 'string'],
            'lines.*.to_bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
            'lines.*.notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'quality_inspection_notes' => ['nullable', 'string'],
        ]);

        return new GoodsReceiptResource($this->service->updateLines(
            $goodsReceipt,
            $validated['lines'],
            [
                'notes' => $validated['notes'] ?? null,
                'quality_inspection_notes' => $validated['quality_inspection_notes'] ?? null,
            ],
        ));
    }
}
