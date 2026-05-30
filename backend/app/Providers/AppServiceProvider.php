<?php

namespace App\Providers;

use App\Events\Production\ProductionStageCompleted;
use App\Events\Projects\ProjectAddonRequested;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Listeners\Procurement\CreateAddonRequisition;
use App\Listeners\Procurement\DraftPurchaseRequisitionFromShortage;
use App\Listeners\Procurement\NotifyGlassProcurement;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Roles\SyncDepartmentRolesToSpatie;
use App\Support\BiboStorage;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->booting(function (): void {
            config(['filesystems.disks.bibo.root' => BiboStorage::rootPath()]);
        });

        $this->app->singleton(CrmAuditLogger::class);
        $this->app->singleton(ProcurementAuditLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function (?User $user, string $ability): ?bool {
            if (! $user instanceof User) {
                return null;
            }

            if ($user->hasRole('super_admin')) {
                return true;
            }

            $hasDepartmentSuperAdmin = $user->departmentRoles()
                ->whereHas('role', fn ($query) => $query->where('name', 'super_admin'))
                ->exists();

            return $hasDepartmentSuperAdmin ? true : null;
        });

        BiboStorage::ensureCategoryDirectoriesExist();

        RateLimiter::for('bibo-login', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.login_per_minute', 5));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        RateLimiter::for('bibo-refresh', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.refresh_per_minute', 30));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        RateLimiter::for('bibo-accept-invite', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.accept_invite_per_minute', 10));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        RateLimiter::for('bibo-forgot-password', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.forgot_password_per_minute', 5));

            return Limit::perMinute($limit)->by(
                strtolower((string) $request->input('email', '')).'|'.$request->ip()
            );
        });

        RateLimiter::for('bibo-reset-password', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.reset_password_per_minute', 10));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        RateLimiter::for('bibo-recover-email', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.recover_email_per_minute', 5));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        RateLimiter::for('bibo-invite', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.invite_per_hour', 10));

            $user = $request->user();

            $key = $user instanceof User ? (string) $user->getKey() : (string) $request->ip();

            return Limit::perHour($limit)->by($key);
        });

        RateLimiter::for('bibo-upload', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.upload_per_minute', 10));

            $user = $request->user();

            $key = $user instanceof User ? 'user:'.$user->getKey() : (string) $request->ip();

            return Limit::perMinute($limit)->by($key);
        });

        RateLimiter::for('bibo-2fa-verify', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.two_factor_verify_per_minute', 10));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        RateLimiter::for('bibo-2fa-resend', function (Request $request): Limit {
            $limit = max(1, (int) config('bibo.rate_limit.two_factor_resend_per_minute', 3));

            return Limit::perMinute($limit)->by((string) $request->ip());
        });

        UserDepartmentRole::saved(function (UserDepartmentRole $row): void {
            $user = User::query()->find($row->user_id);

            if ($user) {
                app(SyncDepartmentRolesToSpatie::class)->sync($user);
            }
        });

        UserDepartmentRole::deleted(function (UserDepartmentRole $row): void {
            $user = User::query()->find($row->user_id);

            if ($user) {
                app(SyncDepartmentRolesToSpatie::class)->sync($user);
            }
        });

        $this->registerProcurementListeners();
    }

    protected function registerProcurementListeners(): void
    {
        Event::listen(ProjectMaterialShortageDetected::class, DraftPurchaseRequisitionFromShortage::class);
        Event::listen(ProjectAddonRequested::class, CreateAddonRequisition::class);
        Event::listen(ProductionStageCompleted::class, NotifyGlassProcurement::class);
    }
}
