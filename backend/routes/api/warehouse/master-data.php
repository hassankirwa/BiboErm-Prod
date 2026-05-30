<?php

use App\Http\Controllers\Warehouse\MasterData\AccessoryController;
use App\Http\Controllers\Warehouse\MasterData\AluminiumProfileController;
use App\Http\Controllers\Warehouse\MasterData\DoorTypeController;
use App\Http\Controllers\Warehouse\MasterData\RubberController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.master_data.view|warehouse.master_data.manage')->group(function () {
    Route::get('master-data/door-types', [DoorTypeController::class, 'index']);
    Route::get('master-data/aluminium-profiles', [AluminiumProfileController::class, 'index']);
    Route::get('master-data/accessories', [AccessoryController::class, 'index']);
    Route::get('master-data/rubbers', [RubberController::class, 'index']);
    Route::get('master-data/rubbers/suggest', [RubberController::class, 'suggest']);
});

Route::middleware('permission:warehouse.master_data.manage')->group(function () {
    Route::post('master-data/door-types', [DoorTypeController::class, 'store']);
    Route::post('master-data/aluminium-profiles', [AluminiumProfileController::class, 'store']);
    Route::post('master-data/accessories', [AccessoryController::class, 'store']);
    Route::post('master-data/rubbers', [RubberController::class, 'store']);
});
