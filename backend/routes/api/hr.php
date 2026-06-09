<?php

use App\Http\Controllers\Hr\HrDashboardController;
use App\Http\Controllers\Hr\HrDocumentController;
use App\Http\Controllers\Hr\HrEmployeeController;
use App\Http\Controllers\Hr\HrEmployeeIdentityController;
use App\Http\Controllers\Hr\HrEmployeeLookupController;
use App\Http\Controllers\Hr\HrEmployeeProfileController;
use App\Http\Controllers\Hr\HrLeaveRequestController;
use App\Http\Controllers\Hr\HrProfileChangeRequestController;
use App\Http\Controllers\Hr\PayrollApprovalController;
use App\Http\Controllers\Hr\PayrollRunController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:employees.view')->group(function () {
    Route::get('dashboard/stats', [HrDashboardController::class, 'stats']);
    Route::get('dashboard/pending-profile-changes', [HrDashboardController::class, 'pendingProfileChanges']);
    Route::get('employees/suggested-number', [HrEmployeeLookupController::class, 'suggestedEmployeeNumber']);
    Route::get('employees', [HrEmployeeController::class, 'index']);
    Route::get('employees/{user}', [HrEmployeeController::class, 'show']);
});

Route::middleware('permission:employees.update_hr_details')
    ->put('employees/{user}', [HrEmployeeProfileController::class, 'upsert']);

Route::middleware('permission:employees.approve')
    ->post('employees/{user}/approve', [HrEmployeeProfileController::class, 'approve']);

Route::middleware('permission:users.update_identity')->group(function () {
    Route::patch('employees/{user}/identity', [HrEmployeeIdentityController::class, 'update']);
    Route::post('employees/{user}/reset-password', [HrEmployeeIdentityController::class, 'resetPassword']);
});

Route::middleware('permission:profile_changes.review')->group(function () {
    Route::post('profile-change-requests/{profileChangeRequest}/approve', [HrProfileChangeRequestController::class, 'approve']);
    Route::post('profile-change-requests/{profileChangeRequest}/reject', [HrProfileChangeRequestController::class, 'reject']);
});

Route::middleware('permission:leave.review,web')->group(function () {
    Route::get('leave-requests', [HrLeaveRequestController::class, 'index']);
    Route::post('leave-requests/{leaveRequest}/approve', [HrLeaveRequestController::class, 'approve']);
    Route::post('leave-requests/{leaveRequest}/reject', [HrLeaveRequestController::class, 'reject']);
});

Route::middleware('permission:hr_documents.manage,web')->group(function () {
    Route::get('documents', [HrDocumentController::class, 'index']);
    Route::post('documents', [HrDocumentController::class, 'store'])->middleware('throttle:bibo-upload');
    Route::delete('documents/{hrDocument}', [HrDocumentController::class, 'destroy']);
    Route::get('documents/{hrDocument}/download', [HrDocumentController::class, 'download']);
});

Route::middleware('permission:payroll.manage|payroll.view|payroll.approve,web')->group(function () {
    Route::get('payroll-runs', [PayrollRunController::class, 'index']);
    Route::get('payroll-runs/{payrollRun}', [PayrollRunController::class, 'show']);
});

Route::middleware('permission:payroll.manage,web')->group(function () {
    Route::post('payroll-runs', [PayrollRunController::class, 'store']);
    Route::post('payroll-runs/{payrollRun}/generate', [PayrollRunController::class, 'generate']);
    Route::patch('payroll-runs/{payrollRun}/entries/{payrollEntry}', [PayrollRunController::class, 'updateEntry']);
    Route::post('payroll-runs/{payrollRun}/submit', [PayrollRunController::class, 'submit']);
});

Route::middleware('permission:payroll.approve,web')->group(function () {
    Route::post('payroll-runs/{payrollRun}/approve', [PayrollApprovalController::class, 'approve']);
    Route::post('payroll-runs/{payrollRun}/reject', [PayrollApprovalController::class, 'reject']);
});
