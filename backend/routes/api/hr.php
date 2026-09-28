<?php

use App\Http\Controllers\Hr\EmployeeInviteController;
use App\Http\Controllers\Hr\EmployeeImportController;
use App\Http\Controllers\Hr\EmployeePayComponentController;
use App\Http\Controllers\Hr\DepartmentSettingsController;
use App\Http\Controllers\Hr\HrDashboardController;
use App\Http\Controllers\Hr\HrDocumentController;
use App\Http\Controllers\Hr\HrEmployeeController;
use App\Http\Controllers\Hr\HrEmployeeIdentityController;
use App\Http\Controllers\Hr\HrEmployeeLookupController;
use App\Http\Controllers\Hr\HrEmployeeProfileController;
use App\Http\Controllers\Hr\HrLeaveRequestController;
use App\Http\Controllers\Hr\HrProfileChangeRequestController;
use App\Http\Controllers\Hr\HrRequestController;
use App\Http\Controllers\Hr\HrSuggestionController;
use App\Http\Controllers\Hr\PayrollApprovalController;
use App\Http\Controllers\Hr\PayrollRunController;
use App\Http\Controllers\Hr\PayrollSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware('permission:employees.view')->group(function () {
    Route::get('dashboard/stats', [HrDashboardController::class, 'stats']);
    Route::get('dashboard/pending-profile-changes', [HrDashboardController::class, 'pendingProfileChanges']);
    Route::get('employees/suggested-number', [HrEmployeeLookupController::class, 'suggestedEmployeeNumber']);
    Route::get('employees', [HrEmployeeController::class, 'index']);
    Route::get('employees/{user}', [HrEmployeeController::class, 'show']);
});

Route::middleware('permission:employees.create')
    ->post('employees', [HrEmployeeController::class, 'store']);

Route::middleware('permission:users.invite')->group(function () {
    Route::post('employees/{user}/send-invite', [EmployeeInviteController::class, 'store']);
});

Route::middleware('permission:payroll.manage|employees.update_hr_details,web')->group(function () {
    Route::get('department-settings', [DepartmentSettingsController::class, 'index']);
    Route::put('department-settings', [DepartmentSettingsController::class, 'update']);
});

Route::middleware('permission:employees.update_hr_details')->group(function () {
    Route::put('employees/{user}', [HrEmployeeProfileController::class, 'upsert']);
    Route::get('employees/{user}/pay-components', [EmployeePayComponentController::class, 'index']);
    Route::post('employees/{user}/pay-components', [EmployeePayComponentController::class, 'store']);
    Route::patch('employees/{user}/pay-components/{payComponent}', [EmployeePayComponentController::class, 'update']);
    Route::delete('employees/{user}/pay-components/{payComponent}', [EmployeePayComponentController::class, 'destroy']);
});

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

Route::middleware('permission:hr_requests.review,web')->group(function () {
    Route::get('requests', [HrRequestController::class, 'index']);
    Route::post('requests/{hrRequest}/approve', [HrRequestController::class, 'approve']);
    Route::post('requests/{hrRequest}/reject', [HrRequestController::class, 'reject']);
});

Route::middleware('permission:suggestions.review,web')->group(function () {
    Route::get('suggestions', [HrSuggestionController::class, 'index']);
    Route::patch('suggestions/{hrSuggestion}', [HrSuggestionController::class, 'updateStatus']);
});

Route::middleware('permission:hr_documents.manage,web')->group(function () {
    Route::get('documents', [HrDocumentController::class, 'index']);
    Route::post('documents', [HrDocumentController::class, 'store'])->middleware('throttle:bibo-upload');
    Route::delete('documents/{hrDocument}', [HrDocumentController::class, 'destroy']);
    Route::get('documents/{hrDocument}/download', [HrDocumentController::class, 'download']);
});

Route::middleware('permission:employees.import,web')->group(function () {
    Route::post('employees/import/extract', [EmployeeImportController::class, 'extract'])->middleware('throttle:bibo-upload');
    Route::post('employees/import', [EmployeeImportController::class, 'import']);
    Route::delete('employees/import/extract/{token}', [EmployeeImportController::class, 'discard']);
});

Route::middleware('permission:payroll.manage|payroll.view|payroll.approve,web')->group(function () {
    Route::get('payroll-runs', [PayrollRunController::class, 'index']);
    Route::get('payroll-runs/{payrollRun}', [PayrollRunController::class, 'show']);
    Route::get('payroll-settings', [PayrollSettingsController::class, 'show']);
});

Route::middleware('permission:payroll.manage,web')->group(function () {
    Route::post('payroll-runs', [PayrollRunController::class, 'store']);
    Route::post('payroll-runs/{payrollRun}/generate', [PayrollRunController::class, 'generate']);
    Route::patch('payroll-runs/{payrollRun}/entries/{payrollEntry}', [PayrollRunController::class, 'updateEntry']);
    Route::post('payroll-runs/{payrollRun}/submit', [PayrollRunController::class, 'submit']);
    Route::put('payroll-settings', [PayrollSettingsController::class, 'updateSettings']);
    Route::post('payroll-settings/deduction-types', [PayrollSettingsController::class, 'storeDeductionType']);
    Route::patch('payroll-settings/deduction-types/{deductionType}', [PayrollSettingsController::class, 'updateDeductionType']);
    Route::delete('payroll-settings/deduction-types/{deductionType}', [PayrollSettingsController::class, 'destroyDeductionType']);
});

Route::middleware('permission:payroll.approve,web')->group(function () {
    Route::post('payroll-runs/{payrollRun}/approve', [PayrollApprovalController::class, 'approve']);
    Route::post('payroll-runs/{payrollRun}/reject', [PayrollApprovalController::class, 'reject']);
});
