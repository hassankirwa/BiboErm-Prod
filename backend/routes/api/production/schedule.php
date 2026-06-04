<?php

use App\Http\Controllers\Production\ProductionScheduleController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:production.view')->get('schedule', [ProductionScheduleController::class, 'index']);
