<?php

use App\Http\Controllers\QualityControl\QcDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:qc.view')->get('dashboard/summary', [QcDashboardController::class, 'summary']);
