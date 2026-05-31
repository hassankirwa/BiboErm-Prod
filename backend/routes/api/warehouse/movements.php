<?php

use App\Http\Controllers\Warehouse\Movements\AdjustStockController;
use App\Http\Controllers\Warehouse\Movements\IssueStockController;
use App\Http\Controllers\Warehouse\Movements\ReceiveStockController;
use App\Http\Controllers\Warehouse\Movements\StockMovementController;
use App\Http\Controllers\Warehouse\Movements\TransferStockController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.stock.view')->get('movements', [StockMovementController::class, 'index']);

Route::middleware('permission:warehouse.stock.receive')->post('movements/receive', ReceiveStockController::class);
Route::middleware('permission:warehouse.stock.transfer')->post('movements/transfer', TransferStockController::class);
Route::middleware('permission:warehouse.stock.adjust')->post('movements/adjust', AdjustStockController::class);
Route::middleware('permission:warehouse.stock.issue')->post('movements/issue', IssueStockController::class);
