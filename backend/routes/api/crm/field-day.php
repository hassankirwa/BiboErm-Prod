<?php

use App\Http\Controllers\Crm\FieldDay\FieldDayController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:field_day.view')->get('field-days', [FieldDayController::class, 'index']);
Route::middleware('permission:field_day.create')->post('field-days', [FieldDayController::class, 'store']);
