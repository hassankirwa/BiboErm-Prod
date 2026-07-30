<?php

namespace App\Http\Controllers\Procurement\Stock;

use App\Http\Controllers\Controller;
use App\Services\Procurement\ProcurementStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProcurementStockController extends Controller
{
    public function __construct(
        protected ProcurementStockService $stock,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:64'],
            'stock_status' => ['nullable', 'string', 'in:all,in_stock,low_stock,out_of_stock'],
            'status' => ['nullable', 'string', 'in:all,in_stock,low_stock,out_of_stock'],
        ]);

        return response()->json([
            'data' => $this->stock->overview($request),
        ]);
    }

    public function analytics(): JsonResponse
    {
        return response()->json([
            'data' => $this->stock->analytics(),
        ]);
    }
}
