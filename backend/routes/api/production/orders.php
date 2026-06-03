<?php

use App\Http\Controllers\Production\CompleteProductionStageController;
use App\Http\Controllers\Production\LogProductionOffcutsController;
use App\Http\Controllers\Production\ProductionOrderController;
use App\Http\Controllers\Production\ProductionTeamController;
use App\Http\Controllers\Production\StartProductionStageController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:production.view')->group(function () {
    Route::get('orders', [ProductionOrderController::class, 'index']);
    Route::get('orders/{order}', [ProductionOrderController::class, 'show']);
    Route::get('orders/{order}/teams', [ProductionTeamController::class, 'index']);
});

Route::middleware('permission:production.schedule.manage')->patch('orders/{order}/schedule', [ProductionOrderController::class, 'updateSchedule']);

Route::middleware('permission:production.schedule.manage')->post('orders/{order}/teams', [ProductionTeamController::class, 'store']);

Route::middleware('permission:production.manage')->group(function () {
    Route::post('orders/{order}/start-stage', StartProductionStageController::class);
    Route::post('orders/{order}/complete-stage', CompleteProductionStageController::class);
    Route::post('orders/{order}/offcuts', LogProductionOffcutsController::class);
});
