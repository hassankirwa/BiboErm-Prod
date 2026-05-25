<?php

namespace App\Providers;

use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Services\Crm\CrmAuditLogger;
use App\Services\Roles\SyncDepartmentRolesToSpatie;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(CrmAuditLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
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
    }
}
