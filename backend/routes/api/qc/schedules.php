<?php

use App\Http\Controllers\QualityControl\QcInspectionScheduleController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:qc.view')->get('schedules', [QcInspectionScheduleController::class, 'index']);
Route::middleware('permission:qc.schedules.manage|qc.manage')->post('schedules', [QcInspectionScheduleController::class, 'store']);
Route::middleware('permission:qc.schedules.manage|qc.manage')->patch('schedules/{schedule}', [QcInspectionScheduleController::class, 'update']);
