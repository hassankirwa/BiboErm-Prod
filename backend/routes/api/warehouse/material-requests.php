<?php

use App\Http\Controllers\Warehouse\MaterialRequests\MaterialRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.stock.view|production.view|production.manage')->group(function () {
    Route::get('material-requests', [MaterialRequestController::class, 'index']);
});

Route::middleware('permission:warehouse.stock.issue|warehouse.reservations.create|production.view|production.manage')->group(function () {
    Route::post('material-requests', [MaterialRequestController::class, 'store']);
});

Route::middleware('permission:warehouse.stock.issue')->group(function () {
    Route::post('material-requests/{materialRequest}/fulfill', [MaterialRequestController::class, 'fulfill']);
    Route::post('material-requests/{materialRequest}/reject', [MaterialRequestController::class, 'reject']);
});
