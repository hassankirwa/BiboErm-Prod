<?php

use App\Http\Controllers\FieldInstallation\FieldDailyLogController;
use App\Http\Controllers\FieldInstallation\FieldDeliveryRecordController;
use App\Http\Controllers\FieldInstallation\FieldInstallationJobController;
use App\Http\Controllers\FieldInstallation\FieldNonConformityController;
use App\Http\Controllers\FieldInstallation\FieldPhotoController;
use App\Http\Controllers\FieldInstallation\FieldToolAssignmentController;
use App\Http\Controllers\FieldInstallation\FieldUnitProgressController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:field_installation.view')->group(function () {
    Route::get('jobs', [FieldInstallationJobController::class, 'index']);
    Route::get('jobs/{fieldJob}', [FieldInstallationJobController::class, 'show']);
    Route::get('jobs/{fieldJob}/daily-logs', [FieldDailyLogController::class, 'index']);
    Route::get('jobs/{fieldJob}/deliveries', [FieldDeliveryRecordController::class, 'index']);
    Route::get('jobs/{fieldJob}/units', [FieldUnitProgressController::class, 'index']);
    Route::get('jobs/{fieldJob}/non-conformities', [FieldNonConformityController::class, 'index']);
    Route::get('photos', [FieldPhotoController::class, 'index']);
});

Route::middleware('permission:field_installation.manage')->group(function () {
    Route::post('jobs', [FieldInstallationJobController::class, 'store']);
    Route::patch('jobs/{fieldJob}', [FieldInstallationJobController::class, 'update']);
    Route::post('jobs/{fieldJob}/start', [FieldInstallationJobController::class, 'start']);
    Route::post('jobs/{fieldJob}/complete', [FieldInstallationJobController::class, 'complete']);
    Route::post('jobs/{fieldJob}/members', [FieldInstallationJobController::class, 'storeMember']);
    Route::delete('jobs/{fieldJob}/members/{userId}', [FieldInstallationJobController::class, 'destroyMember'])
        ->whereNumber('userId');
    Route::patch('non-conformities/{nonConformity}', [FieldNonConformityController::class, 'update']);
});

Route::middleware('permission:field_installation.log')->group(function () {
    Route::post('jobs/{fieldJob}/daily-logs', [FieldDailyLogController::class, 'store']);
    Route::post('photos', [FieldPhotoController::class, 'store']);
    Route::post('jobs/{fieldJob}/non-conformities', [FieldNonConformityController::class, 'store']);
    Route::patch('units/{unit}', [FieldUnitProgressController::class, 'update']);
});

Route::middleware('permission:field_installation.deliver')->group(function () {
    Route::post('jobs/{fieldJob}/deliveries', [FieldDeliveryRecordController::class, 'store']);
});

Route::middleware('permission:field_installation.tools')->group(function () {
    Route::post('jobs/{fieldJob}/tools/issue', [FieldToolAssignmentController::class, 'issue']);
    Route::post('tool-assignments/{toolAssignment}/return', [FieldToolAssignmentController::class, 'returnTool']);
});
