<?php

namespace App\Http\Controllers\Warehouse\StockTake;

use App\Enums\Warehouse\ItemCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Services\Warehouse\StockTake\StockTakeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class StockTakeController extends Controller
{
    public function __construct(
        protected StockTakeService $stockTake,
    ) {}

    /**
     * Step 1 — snapshot system quantities, optionally scoped to a category.
     */
    public function snapshot(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['nullable', 'string', Rule::enum(ItemCategory::class)],
            'deck' => ['nullable', 'string', 'max:30'],
            'section_id' => ['nullable', 'integer', 'exists:warehouse_sections,id'],
            'bin_id' => ['nullable', 'integer', 'exists:warehouse_bins,id'],
        ]);

        return response()->json(
            $this->stockTake->snapshot($request->user(), $filters)
        );
    }

    /**
     * Step 2 — compare physical counts against system stock; return variance report.
     */
    public function variance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'exists:warehouse_items,id'],
            'lines.*.bin_id' => ['required', 'integer', 'exists:warehouse_bins,id'],
            'lines.*.counted_qty' => ['required', 'numeric', 'min:0'],
            'lines.*.variance_reason' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json(
            $this->stockTake->variance($data['lines'])
        );
    }

    /**
     * Step 3 — apply approved variances as adjustment movement(s) with reference_type stock_take.
     * Each variance line must include variance_reason for the audit log.
     */
    public function apply(Request $request): StockMovementResource|JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_id' => ['required', 'integer', 'exists:warehouse_items,id'],
            'lines.*.bin_id' => ['required', 'integer', 'exists:warehouse_bins,id'],
            'lines.*.counted_qty' => ['required', 'numeric', 'min:0'],
            'lines.*.variance_reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $movement = $this->stockTake->apply(
                user: $request->user(),
                counts: $data['lines'],
                notes: $data['notes'] ?? null,
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return new StockMovementResource($movement);
    }
}
