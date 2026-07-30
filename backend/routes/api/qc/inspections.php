<?php

use App\Http\Controllers\QualityControl\QcDefectController;
use App\Http\Controllers\QualityControl\QcInspectionController;
use App\Http\Controllers\QualityControl\QcInspectionPhotoController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:qc.view')->get('inspections', [QcInspectionController::class, 'index']);
Route::middleware('permission:qc.view')->get('inspections/{inspection}', [QcInspectionController::class, 'show']);
Route::middleware('permission:qc.inspect')->post('inspections', [QcInspectionController::class, 'store']);
Route::middleware('permission:qc.inspect')->patch('inspections/{inspection}', [QcInspectionController::class, 'update']);
Route::middleware('permission:qc.inspect')->post('inspections/{inspection}/submit', [QcInspectionController::class, 'submit']);
Route::middleware('permission:qc.inspect')->post('inspections/{inspection}/skip', [QcInspectionController::class, 'skip']);
Route::middleware('permission:qc.inspect')->post('inspections/{inspection}/photos', [QcInspectionPhotoController::class, 'store']);
Route::middleware('permission:qc.inspect')->post('inspections/{inspection}/defects', [QcDefectController::class, 'store']);
