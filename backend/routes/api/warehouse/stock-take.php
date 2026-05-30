<?php

use App\Http\Controllers\Warehouse\StockTake\StockTakeController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.stocktake.view')->group(function () {
    Route::get('stock-take/snapshot', [StockTakeController::class, 'snapshot']);
    Route::post('stock-take/variance', [StockTakeController::class, 'variance']);
});

Route::middleware('permission:warehouse.stocktake.run')->post('stock-take/apply', [StockTakeController::class, 'apply']);
