<?php

use App\Http\Controllers\Admin\AdminLookupController;
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
use App\Http\Controllers\Auth\TwoFactorLoginController;
use App\Http\Controllers\Hr\HrDashboardController;
use App\Http\Controllers\Hr\HrEmployeeController;
use App\Http\Controllers\Hr\HrEmployeeIdentityController;
use App\Http\Controllers\Hr\HrEmployeeLookupController;
use App\Http\Controllers\Hr\HrEmployeeProfileController;
use App\Http\Controllers\Hr\HrProfileChangeRequestController;
use App\Http\Controllers\ProfileChangeRequestController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StoredFileController;
use App\Http\Controllers\TwoFactorSettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::middleware('throttle:bibo-login')->post('auth/login', [LoginController::class, 'store']);

    Route::middleware('throttle:bibo-2fa-verify')->post('auth/two-factor/verify', [TwoFactorLoginController::class, 'verify']);

    Route::middleware('throttle:bibo-2fa-resend')->post('auth/two-factor/resend', [TwoFactorLoginController::class, 'resend']);

    Route::middleware('throttle:bibo-refresh')->post('auth/refresh', [RefreshSessionController::class, 'store']);

    Route::middleware('throttle:bibo-accept-invite')->post('auth/accept-invite', [InviteAcceptController::class, 'store']);

    Route::middleware('throttle:bibo-forgot-password')->post('auth/forgot-password', [ForgotPasswordController::class, 'store']);

    Route::middleware('throttle:bibo-reset-password')->post('auth/reset-password', [ResetPasswordController::class, 'store']);

    Route::middleware('throttle:bibo-recover-email')->post('auth/recover-email', [RecoverEmailController::class, 'store']);

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('auth/change-password', [ChangePasswordController::class, 'update'])
            ->middleware('device.trusted');
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('auth/logout', [LogoutController::class, 'destroy']);
        Route::get('auth/me', [AuthMeController::class, 'show']);

        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update'])
            ->middleware('device.trusted');

        Route::post('profile/avatar', [ProfileController::class, 'avatar'])
            ->middleware(['device.trusted', 'throttle:bibo-upload']);

        Route::post('profile/change-requests', [ProfileChangeRequestController::class, 'store'])
            ->middleware('device.trusted');

        Route::post('profile/two-factor/enable', [TwoFactorSettingsController::class, 'enable'])
            ->middleware('device.trusted');

        Route::post('profile/two-factor/disable', [TwoFactorSettingsController::class, 'disable'])
            ->middleware('device.trusted');

        Route::get('files/{category}/{owner}/{filename}', [StoredFileController::class, 'show'])
            ->where([
                'category' => '[a-zA-Z0-9._-]+',
                'owner' => '[a-zA-Z0-9._-]+',
                'filename' => '[a-zA-Z0-9._-]+',
            ]);
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

            Route::middleware('role_or_permission:users.invite|users.view')->prefix('lookups')->group(function () {
                Route::get('departments', [AdminLookupController::class, 'departments']);
                Route::get('roles', [AdminLookupController::class, 'roles']);
            });

            Route::middleware('permission:users.suspend')
                ->patch('users/{user}/status', [UserManagementController::class, 'updateStatus']);

            Route::middleware('permission:users.update')
                ->put('users/{user}/assignments', [UserManagementController::class, 'replaceAssignments']);
        });

    Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
        ->prefix('hr')
        ->group(function () {
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
        });

    Route::middleware(['auth:sanctum', 'active'])
        ->prefix('lookups')
        ->group(function () {
            require __DIR__.'/api/lookups.php';
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
        require __DIR__.'/api/crm/reports.php';
    });

    Route::middleware(['auth:sanctum', 'active', 'device.trusted'])->prefix('projects')->group(function () {
        require __DIR__.'/api/projects.php';
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('procurement')->group(function () {
        require __DIR__.'/api/procurement.php';
    });

    Route::middleware(['auth:sanctum', 'active', 'device.trusted'])->prefix('warehouse')->group(function () {
        require __DIR__.'/api/warehouse/locations.php';
        require __DIR__.'/api/warehouse/inventory.php';
        require __DIR__.'/api/warehouse/movements.php';
        require __DIR__.'/api/warehouse/reservations.php';
        require __DIR__.'/api/warehouse/offcuts.php';
        require __DIR__.'/api/warehouse/master-data.php';
        require __DIR__.'/api/warehouse/tools.php';
        require __DIR__.'/api/warehouse/stock-take.php';
    });

    Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
        ->prefix('production')
        ->group(function () {
            require __DIR__.'/api/production/orders.php';
            require __DIR__.'/api/production/schedule.php';
            require __DIR__.'/api/production/cutting.php';
        });

    Route::middleware(['auth:sanctum', 'active'])
        ->prefix('qc')
        ->group(function () {
            require __DIR__.'/api/qc/templates.php';
            require __DIR__.'/api/qc/inspections.php';
            require __DIR__.'/api/qc/defects.php';
            require __DIR__.'/api/qc/schedules.php';
            require __DIR__.'/api/qc/dashboard.php';
        });
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
    require __DIR__.'/api/crm/reports.php';
});

Route::middleware(['auth:sanctum', 'active', 'device.trusted'])->prefix('projects')->group(function () {
    require __DIR__.'/api/projects.php';
});

Route::middleware(['auth:sanctum', 'active'])->prefix('procurement')->group(function () {
    require __DIR__.'/api/procurement.php';
});

Route::middleware(['auth:sanctum', 'active', 'device.trusted'])->prefix('warehouse')->group(function () {
    require __DIR__.'/api/warehouse/locations.php';
    require __DIR__.'/api/warehouse/inventory.php';
    require __DIR__.'/api/warehouse/movements.php';
    require __DIR__.'/api/warehouse/reservations.php';
    require __DIR__.'/api/warehouse/offcuts.php';
    require __DIR__.'/api/warehouse/master-data.php';
    require __DIR__.'/api/warehouse/tools.php';
    require __DIR__.'/api/warehouse/stock-take.php';
});

Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
    ->prefix('field-installation')
    ->group(function () {
        require __DIR__.'/api/field-installation.php';
    });
}); // v1
