<?php

use App\Http\Controllers\Admin\InviteUserController;
use App\Http\Controllers\Admin\ResendInviteController;
use App\Http\Controllers\Admin\RevokeInvitationController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Auth\AuthMeController;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\InviteAcceptController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RecoverEmailController;
use App\Http\Controllers\Auth\RefreshSessionController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Hr\HrEmployeeProfileController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
Route::middleware('throttle:bibo-login')->post('auth/login', [LoginController::class, 'store']);

Route::middleware('throttle:bibo-refresh')->post('auth/refresh', [RefreshSessionController::class, 'store']);

Route::middleware('throttle:bibo-accept-invite')->post('auth/accept-invite', [InviteAcceptController::class, 'store']);

Route::middleware('throttle:bibo-forgot-password')->post('auth/forgot-password', [ForgotPasswordController::class, 'store']);

Route::middleware('throttle:bibo-reset-password')->post('auth/reset-password', [ResetPasswordController::class, 'store']);

Route::middleware('throttle:bibo-recover-email')->post('auth/recover-email', [RecoverEmailController::class, 'store']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('auth/logout', [LogoutController::class, 'destroy']);
    Route::get('auth/me', [AuthMeController::class, 'show']);

    Route::post('auth/change-password', [ChangePasswordController::class, 'update'])
        ->middleware('device.trusted');

    Route::put('profile', [ProfileController::class, 'update'])
        ->middleware('device.trusted');

    Route::post('profile/avatar', [ProfileController::class, 'avatar'])
        ->middleware('device.trusted');
});

Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
    ->prefix('admin')
    ->group(function () {
        Route::middleware(['permission:users.invite', 'throttle:bibo-invite'])->group(function () {
            Route::post('users/invite', [InviteUserController::class, 'store']);
            Route::post('users/{user}/resend-invite', [ResendInviteController::class, 'store']);
            Route::post('invitations/{invitation}/revoke', [RevokeInvitationController::class, 'store']);
        });

        Route::middleware('permission:users.view')->get('users', [UserManagementController::class, 'index']);

        Route::middleware('permission:users.suspend')
            ->patch('users/{user}/status', [UserManagementController::class, 'updateStatus']);

        Route::middleware('permission:users.update')
            ->put('users/{user}/assignments', [UserManagementController::class, 'replaceAssignments']);
    });

Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
    ->prefix('hr')
    ->group(function () {
        Route::middleware('permission:employees.update_hr_details')
            ->put('employees/{user}', [HrEmployeeProfileController::class, 'upsert']);

        Route::middleware('permission:employees.approve')
            ->post('employees/{user}/approve', [HrEmployeeProfileController::class, 'approve']);
    });

Route::middleware(['auth:sanctum', 'active'])->prefix('crm')->group(function () {
    require __DIR__.'/api/crm/leads.php';
    require __DIR__.'/api/crm/contacts.php';
    require __DIR__.'/api/crm/accounts.php';
    require __DIR__.'/api/crm/deals.php';
    require __DIR__.'/api/crm/site-visits.php';
    require __DIR__.'/api/crm/quotations.php';
    require __DIR__.'/api/crm/activities.php';
    require __DIR__.'/api/crm/field-day.php';
    require __DIR__.'/api/crm/lookups.php';
});
}); // v1
