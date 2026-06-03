<?php

namespace App\Http\Controllers\Procurement\Stock;

use App\Http\Controllers\Controller;
use App\Services\Procurement\ProcurementStockService;
use Illuminate\Http\JsonResponse;

class ProcurementStockController extends Controller
{
    public function __construct(
        protected ProcurementStockService $stock,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->stock->overview(),
        ]);
    }

    public function analytics(): JsonResponse
    {
        return response()->json([
            'data' => $this->stock->analytics(),
        ]);
    }
}
