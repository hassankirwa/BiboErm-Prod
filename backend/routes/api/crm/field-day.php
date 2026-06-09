<?php

use App\Http\Controllers\Crm\FieldDay\FieldDayController;
use App\Http\Controllers\Crm\FieldDay\FieldDayPinController;
use App\Http\Controllers\Crm\FieldDay\StoreFieldDayPinPhotoController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:field_day.view')->get('field-days', [FieldDayController::class, 'index']);
Route::middleware('permission:field_day.view')->get('field-days/{fieldDay}', [FieldDayController::class, 'show']);
Route::middleware('permission:field_day.create')->post('field-days/start', [FieldDayController::class, 'start']);
Route::middleware('permission:field_day.create')->post('field-days', [FieldDayController::class, 'store']);
Route::middleware('permission:field_day.create')->post('field-days/{fieldDay}/pins', [FieldDayPinController::class, 'store']);
Route::middleware('permission:field_day.view')->get('field-day-pins/{fieldDayPin}', [FieldDayPinController::class, 'show']);
Route::middleware('permission:leads.create')->post('field-day-pins/{fieldDayPin}/convert-to-lead', [FieldDayPinController::class, 'convertToLead']);
Route::middleware('permission:field_day.create')->post('field-day-pins/{fieldDayPin}/photos', StoreFieldDayPinPhotoController::class);
