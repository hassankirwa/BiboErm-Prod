<?php

use App\Http\Controllers\Production\CuttingSheetController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:production.view')->get('orders/{order}/cutting-sheet', [CuttingSheetController::class, 'index']);
Route::middleware('permission:production.manage')->group(function () {
    Route::post('orders/{order}/cutting-sheet', [CuttingSheetController::class, 'store']);
    Route::patch('orders/{order}/cutting-sheet/{line}', [CuttingSheetController::class, 'update']);
});
