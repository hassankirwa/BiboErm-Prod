<?php

namespace App\Http\Controllers\Warehouse\Inventory;

use App\Http\Controllers\Controller;
use App\Services\Warehouse\Inventory\LowStockAlertService;
use Illuminate\Http\JsonResponse;

class LowStockAlertController extends Controller
{
    public function __construct(
        protected LowStockAlertService $lowStock,
    ) {}

    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => $this->lowStock->scan(),
        ]);
    }
}
