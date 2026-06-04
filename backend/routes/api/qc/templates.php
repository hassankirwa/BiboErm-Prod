<?php

use App\Http\Controllers\QualityControl\QcChecklistTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:qc.view')->get('templates', [QcChecklistTemplateController::class, 'index']);
Route::middleware('permission:qc.view')->get('templates/{template}', [QcChecklistTemplateController::class, 'show']);
Route::middleware('permission:qc.templates.manage|qc.manage')->post('templates', [QcChecklistTemplateController::class, 'store']);
Route::middleware('permission:qc.templates.manage|qc.manage')->post('templates/{template}/clone', [QcChecklistTemplateController::class, 'clone']);
Route::middleware('permission:qc.templates.manage|qc.manage')->patch('templates/{template}', [QcChecklistTemplateController::class, 'update']);
