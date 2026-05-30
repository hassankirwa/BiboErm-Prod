<?php

namespace App\Http\Controllers\Procurement\Suppliers;

use App\Http\Controllers\Controller;
use App\Models\Procurement\Supplier;
use App\Models\Procurement\SupplierItemPrice;
use App\Services\Procurement\ProcurementAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierItemPriceController extends Controller
{
    public function __construct(protected ProcurementAuditLogger $audit) {}

    public function index(Supplier $supplier): JsonResponse
    {
        $this->authorize('view', $supplier);

        return response()->json([
            'data' => $supplier->itemPrices()->with('warehouseItem')->latest()->get(),
        ]);
    }

    public function store(Request $request, Supplier $supplier): JsonResponse
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'warehouse_item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'effective_from' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        SupplierItemPrice::query()
            ->where('supplier_id', $supplier->id)
            ->where('warehouse_item_id', $validated['warehouse_item_id'])
            ->where('is_current', true)
            ->update(['is_current' => false, 'effective_to' => now()->subDay()->toDateString()]);

        $price = SupplierItemPrice::query()->create([
            ...$validated,
            'supplier_id' => $supplier->id,
            'currency' => $validated['currency'] ?? 'KES',
            'is_current' => true,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('supplier.price_updated', $price);

        return response()->json(['data' => $price->load('warehouseItem')], 201);
    }
}
