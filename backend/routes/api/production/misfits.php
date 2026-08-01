<?php

use App\Http\Controllers\Production\ProductionMisfitController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:production.view')->group(function () {
    Route::get('misfits', [ProductionMisfitController::class, 'index']);
});
