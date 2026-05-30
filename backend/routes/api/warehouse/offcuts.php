<?php

use App\Http\Controllers\Warehouse\Offcuts\AllocateOffcutController;
use App\Http\Controllers\Warehouse\Offcuts\ConsumeOffcutController;
use App\Http\Controllers\Warehouse\Offcuts\LogOffcutController;
use App\Http\Controllers\Warehouse\Offcuts\OffcutAnalyticsController;
use App\Http\Controllers\Warehouse\Offcuts\OffcutController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.offcuts.manage')->group(function () {
    Route::get('offcuts', [OffcutController::class, 'index']);
    Route::get('offcuts/analytics', OffcutAnalyticsController::class);
    Route::patch('offcuts/{offcut}', ConsumeOffcutController::class);
});

Route::middleware('permission:warehouse.offcuts.log')->post('offcuts', LogOffcutController::class);
Route::middleware('permission:warehouse.offcuts.allocate')->post('offcuts/{offcut}/allocate', AllocateOffcutController::class);
