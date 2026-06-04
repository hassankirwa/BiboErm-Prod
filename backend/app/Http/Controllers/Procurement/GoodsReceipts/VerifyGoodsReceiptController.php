<?php

namespace App\Http\Controllers\Procurement\GoodsReceipts;

use App\Http\Controllers\Controller;
use App\Http\Resources\Procurement\GoodsReceiptResource;
use App\Models\Procurement\GoodsReceipt;
use App\Services\Procurement\GoodsReceipts\GoodsReceiptService;
use Illuminate\Http\Request;

class VerifyGoodsReceiptController extends Controller
{
    public function __construct(protected GoodsReceiptService $service) {}

    public function __invoke(Request $request, GoodsReceipt $goodsReceipt): GoodsReceiptResource
    {
        $this->authorize('verify', $goodsReceipt);

        $validated = $request->validate([
            'lines' => ['sometimes', 'array'],
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
        ]);

        if (! empty($validated['lines'])) {
            $this->service->updateLines(
                $goodsReceipt,
                $validated['lines'],
                [
                    'notes' => $validated['notes'] ?? null,
                    'quality_inspection_notes' => $validated['quality_inspection_notes'] ?? null,
                ],
            );
            $goodsReceipt->refresh();
        }

        return new GoodsReceiptResource($this->service->verify($goodsReceipt, $request->user()));
    }
}
