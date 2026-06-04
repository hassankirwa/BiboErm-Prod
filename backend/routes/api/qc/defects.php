<?php

use App\Http\Controllers\QualityControl\QcDefectController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:qc.view')->get('defects', [QcDefectController::class, 'index']);
Route::middleware('permission:qc.manage|qc.defects.resolve')->patch('defects/{defect}', [QcDefectController::class, 'update']);
