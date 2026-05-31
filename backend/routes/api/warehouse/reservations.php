<?php

use App\Http\Controllers\Warehouse\Reservations\FifoReservationReorderController;
use App\Http\Controllers\Warehouse\Reservations\ProjectReservationController;
use App\Http\Controllers\Warehouse\Reservations\ReleaseReservedStockController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:warehouse.reservations.view')->group(function () {
    Route::get('reservations', [ProjectReservationController::class, 'index']);
    Route::post('projects/{project}/stock-check', [ProjectReservationController::class, 'stockCheck']);
});

Route::middleware('permission:warehouse.reservations.create')->post('projects/{project}/reserve', [ProjectReservationController::class, 'reserve']);
Route::middleware('permission:warehouse.reservations.release')->post('reservations/{reservation}/release', ReleaseReservedStockController::class);
Route::middleware(['permission:warehouse.reservations.create', 'role:operations_manager|super_admin'])
    ->post('reservations/reorder', FifoReservationReorderController::class);
