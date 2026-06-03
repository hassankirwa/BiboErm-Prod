<?php

use App\Http\Controllers\Warehouse\Locations\BinController;
use App\Http\Controllers\Warehouse\Locations\DeckController;
use App\Http\Controllers\Warehouse\Locations\LocationTreeController;
use App\Http\Controllers\Warehouse\Locations\SectionController;
use App\Http\Controllers\Warehouse\Locations\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.locations.view|procurement.view|procurement.grn.view|warehouse.stock.view|warehouse.stock.receive')->group(function () {
    Route::get('locations/tree', LocationTreeController::class);
    Route::get('warehouses', [WarehouseController::class, 'index']);
    Route::get('decks', [DeckController::class, 'index']);
    Route::get('decks/{deck}/sections', [DeckController::class, 'sections']);
    Route::get('sections/{section}/bins', [SectionController::class, 'bins']);
});

Route::middleware('permission:warehouse.locations.manage')->group(function () {
    Route::post('sections', [SectionController::class, 'store']);
    Route::post('bins', [BinController::class, 'store']);
});
