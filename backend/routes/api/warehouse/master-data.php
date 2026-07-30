<?php

use App\Http\Controllers\Warehouse\MasterData\AccessoryController;
use App\Http\Controllers\Warehouse\MasterData\AluminiumProfileController;
use App\Http\Controllers\Warehouse\MasterData\DoorTypeController;
use App\Http\Controllers\Warehouse\MasterData\MaterialCatalogController;
use App\Http\Controllers\Warehouse\MasterData\MaterialMasterController;
use App\Http\Controllers\Warehouse\MasterData\RubberController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.master_data.view|warehouse.master_data.manage')->group(function () {
    Route::get('master-data/door-types', [DoorTypeController::class, 'index']);
    Route::get('master-data/aluminium-profiles', [AluminiumProfileController::class, 'index']);
    Route::get('master-data/accessories', [AccessoryController::class, 'index']);
    Route::get('master-data/rubbers', [RubberController::class, 'index']);
    Route::get('master-data/rubbers/suggest', [RubberController::class, 'suggest']);
    Route::get('master-data/material-catalog/export', [MaterialCatalogController::class, 'export']);
    Route::get('master-data/material-catalog', [MaterialCatalogController::class, 'index']);
    Route::get('master-data/catalog-items', [MaterialCatalogController::class, 'catalogItems']);
});

Route::middleware('permission:warehouse.master_data.manage')->group(function () {
    Route::post('master-data/door-types', [DoorTypeController::class, 'store']);
    Route::patch('master-data/door-types/{doorType}', [DoorTypeController::class, 'update']);
    Route::delete('master-data/door-types/{doorType}', [DoorTypeController::class, 'destroy']);
    Route::post('master-data/aluminium-profiles', [AluminiumProfileController::class, 'store']);
    Route::patch('master-data/aluminium-profiles/{item}', [AluminiumProfileController::class, 'update']);
    Route::delete('master-data/aluminium-profiles/{item}', [AluminiumProfileController::class, 'destroy']);
    Route::post('master-data/accessories', [AccessoryController::class, 'store']);
    Route::patch('master-data/accessories/{item}', [AccessoryController::class, 'update']);
    Route::delete('master-data/accessories/{item}', [AccessoryController::class, 'destroy']);
    Route::post('master-data/rubbers', [RubberController::class, 'store']);
    Route::patch('master-data/rubbers/{item}', [RubberController::class, 'update']);
    Route::delete('master-data/rubbers/{item}', [RubberController::class, 'destroy']);
    Route::post('master-data/material-catalog/extract', [MaterialCatalogController::class, 'extract']);
    Route::post('master-data/material-catalog/import', [MaterialCatalogController::class, 'import']);
    Route::delete('master-data/material-catalog/extract/{token}', [MaterialCatalogController::class, 'discardExtract']);
    Route::post('master-data/materials/extract', [MaterialMasterController::class, 'extract']);
    Route::post('master-data/materials/import', [MaterialMasterController::class, 'import']);
});
