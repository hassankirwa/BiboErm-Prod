<?php

use App\Http\Controllers\Crm\Activities\CrmActivityController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:activities.view')->get('activities', [CrmActivityController::class, 'index']);
Route::middleware('permission:activities.create')->post('activities', [CrmActivityController::class, 'store']);
Route::middleware('permission:activities.complete')->patch('activities/{activity}/complete', [CrmActivityController::class, 'complete']);
