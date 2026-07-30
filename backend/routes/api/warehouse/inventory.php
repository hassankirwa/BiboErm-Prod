<?php

use App\Http\Controllers\Warehouse\Inventory\ItemSearchController;
use App\Http\Controllers\Warehouse\Inventory\LowStockAlertController;
use App\Http\Controllers\Warehouse\Inventory\PutawayOptionsController;
use App\Http\Controllers\Warehouse\Inventory\StockLevelController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.stock.view|procurement.view|procurement.grn.view|warehouse.stock.receive')->group(function () {
    Route::get('inventory/putaway-options', PutawayOptionsController::class);
});

Route::middleware('permission:warehouse.stock.view')->group(function () {
    Route::get('inventory', [StockLevelController::class, 'index']);
    Route::get('inventory/search', ItemSearchController::class);
    Route::get('inventory/search/locations', [ItemSearchController::class, 'withLocations']);
    Route::get('inventory/by-location', [StockLevelController::class, 'byLocation']);
    Route::get('inventory/low-stock', LowStockAlertController::class);
    Route::get('items/{item}/stock', [StockLevelController::class, 'forItem'])->whereNumber('item');
});
