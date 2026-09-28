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
use App\Http\Controllers\ClientPortal\ClientPortalController;
use App\Http\Controllers\Hr\HrProfileChangeRequestController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\MyHrDocumentController;
use App\Http\Controllers\MyPayslipController;
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

    Route::middleware('throttle:20,1')->post('client-portal/access', [ClientPortalController::class, 'access']);
    Route::middleware('throttle:60,1')->get('client-portal/projects/{project}/progress', [ClientPortalController::class, 'progress']);
    Route::middleware('throttle:60,1')->get('client-portal/projects/{project}/documents/{document}', [ClientPortalController::class, 'document']);
    Route::middleware('throttle:120,1')->get('client-portal/projects/{project}/media/{mediaKey}', [ClientPortalController::class, 'media'])
        ->where('mediaKey', '[A-Za-z0-9_-]+');

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

        Route::get('leave-requests', [LeaveRequestController::class, 'index']);
        Route::post('leave-requests', [LeaveRequestController::class, 'store'])
            ->middleware('device.trusted');
        Route::post('leave-requests/{leaveRequest}/cancel', [LeaveRequestController::class, 'cancel'])
            ->middleware('device.trusted');

        Route::get('my/hr-requests', [\App\Http\Controllers\Hr\HrRequestController::class, 'myIndex']);
        Route::post('my/hr-requests', [\App\Http\Controllers\Hr\HrRequestController::class, 'myStore'])
            ->middleware('device.trusted');
        Route::post('my/hr-suggestions', [\App\Http\Controllers\Hr\HrSuggestionController::class, 'myStore'])
            ->middleware('device.trusted');

        Route::get('my/hr-documents', [MyHrDocumentController::class, 'index']);
        Route::get('my/hr-documents/{hrDocument}/download', [MyHrDocumentController::class, 'download']);

        Route::get('my/payslips', [MyPayslipController::class, 'index']);
        Route::get('my/payslips/{payrollEntry}/download', [MyPayslipController::class, 'download']);

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
            require __DIR__.'/api/hr.php';
        });

    Route::middleware(['auth:sanctum', 'active'])
        ->prefix('lookups')
        ->group(function () {
            require __DIR__.'/api/lookups.php';
        });

    Route::middleware(['auth:sanctum', 'active'])->prefix('pipeline')->group(function () {
        Route::get('dashboard', \App\Http\Controllers\PipelineDashboardController::class)
            ->middleware('permission:crm.view|leads.view|projects.view');
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('workspace')->group(function () {
        require __DIR__.'/api/workspace.php';
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('site-ops')->group(function () {
        require __DIR__.'/api/site-ops.php';
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('design')->group(function () {
        require __DIR__.'/api/design.php';
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('notifications')->group(function () {
        require __DIR__.'/api/notifications.php';
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('quotation')->group(function () {
        require __DIR__.'/api/quotation.php';
    });

    Route::middleware(['auth:sanctum', 'active'])->prefix('crm')->group(function () {
        require __DIR__.'/api/crm/leads.php';
        require __DIR__.'/api/crm/contacts.php';
        require __DIR__.'/api/crm/accounts.php';
        require __DIR__.'/api/crm/deals.php';
        require __DIR__.'/api/crm/site-visits.php';
        require __DIR__.'/api/crm/quotations.php';
        require __DIR__.'/api/crm/activities.php';
        require __DIR__.'/api/crm/calendar.php';
        require __DIR__.'/api/crm/field-day.php';
        require __DIR__.'/api/crm/lookups.php';
        require __DIR__.'/api/crm/reports.php';
        require __DIR__.'/api/crm/home.php';
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
        require __DIR__.'/api/warehouse/material-requests.php';
    });

    Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
        ->prefix('production')
        ->group(function () {
            require __DIR__.'/api/production/orders.php';
            require __DIR__.'/api/production/schedule.php';
            require __DIR__.'/api/production/cutting.php';
            require __DIR__.'/api/production/misfits.php';
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

    Route::middleware(['auth:sanctum', 'active', 'device.trusted'])
        ->prefix('field-installation')
        ->group(function () {
            require __DIR__.'/api/field-installation.php';
        });
}); // v1
