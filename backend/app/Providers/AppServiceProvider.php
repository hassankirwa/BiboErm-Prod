<?php

namespace App\Providers;

use App\Events\FieldInstallation\FieldDeliveryRecorded;
use App\Events\FieldInstallation\FieldInstallationCompleted;
use App\Events\FieldInstallation\FieldNonConformityReported;
use App\Events\Crm\DealProjectCreated;
use App\Events\Procurement\GoodsReceiptVerified;
use App\Events\Procurement\PurchaseRequisitionApproved;
use App\Events\Production\ProductionStageCompleted;
use App\Events\Projects\ProjectAddonRequested;
use App\Events\Projects\ProjectBomFinalized;
use App\Events\Projects\ProjectStageAdvanced;
use App\Events\Warehouse\ProjectMaterialShortageDetected;
use App\Events\Warehouse\ProjectMaterialsReady;
use App\Events\Warehouse\ProjectMaterialsReserved;
use App\Events\Warehouse\ToolReplacementRequired;
use App\Events\Warehouse\WarehouseLowStockDetected;
use App\Listeners\FieldInstallation\CreateFieldJobOnInstallationStage;
use App\Listeners\FieldInstallation\NotifyPmOnFieldNonConformity;
use App\Listeners\Procurement\CreateAddonRequisition;
use App\Listeners\Procurement\DraftPurchaseRequisitionFromShortage;
use App\Listeners\FieldInstallation\ForwardNairobiFieldOnSashComplete;
use App\Listeners\Procurement\NotifyGlassProcurement;
use App\Listeners\Procurement\UnlockPurchaseOrderCreation;
use App\Listeners\Production\CreateProductionOrder;
use App\Listeners\Production\NotifyProductionManagersOfNewOrder;
use App\Listeners\QualityControl\CreateProductionQcInspection;
use App\Listeners\QualityControl\CreateSiteInspectionOnFieldJobComplete;
use App\Listeners\QualityControl\CreateSiteReceivingInspectionOnDelivery;
use App\Listeners\Projects\AdvanceProjectOnFieldDeliveryAccepted;
use App\Listeners\Projects\CreateDesignChangeOrderOnMeasurementNc;
use App\Listeners\Projects\OnDealProjectCreated;
use App\Listeners\Projects\OnFieldInstallationCompleted;
use App\Listeners\Projects\OnProductionStageCompleted;
use App\Listeners\Projects\OnProjectBomFinalized;
use App\Listeners\Projects\OnProjectMaterialShortageDetected;
use App\Listeners\Projects\OnProjectMaterialsReady;
use App\Listeners\Projects\OnProjectMaterialsReserved;
use App\Listeners\Projects\OnSiteInstallationQcCompleted;
use App\Events\QualityControl\QcInspectionCompleted;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\FieldInstallation\FieldInstallationUnit;
use App\Models\FieldInstallation\FieldNonConformity;
use App\Models\FieldInstallation\FieldToolAssignment;
use App\Models\Project;
use App\Listeners\Warehouse\CreateToolIncidentOnReplacementRequired;
use App\Listeners\Warehouse\HandleProjectBomFinalized;
use App\Listeners\Warehouse\NotifyProcurementOfficersOfLowStock;
use App\Listeners\Warehouse\ReceiveGoodsIntoWarehouse;
use App\Listeners\Warehouse\ReleaseMaterialsOnProductionStageCompleted;
use App\Models\Production\CuttingSheet;
use App\Models\Production\ProductionOrder;
use App\Models\Projects\DesignChangeOrder;
use App\Models\Projects\ProjectDispatch;
use App\Models\User;
use App\Models\UserDepartmentRole;
use App\Models\Warehouse\Bin;
use App\Models\Warehouse\Deck;
use App\Models\Warehouse\OffcutPiece;
use App\Models\Warehouse\Section;
use App\Models\Warehouse\StockReservation;
use App\Models\Warehouse\Tool;
use App\Models\Warehouse\ToolIncident;
use App\Models\Warehouse\ToolIssuance;
use App\Policies\FieldInstallation\FieldInstallationJobPolicy;
use App\Policies\Production\ProductionOrderPolicy;
use App\Policies\Production\ProductionSchedulePolicy;
use App\Policies\ProjectPolicy;
use App\Policies\Warehouse\OffcutPolicy;
use App\Policies\Warehouse\StockMovementPolicy;
use App\Services\Crm\CrmAuditLogger;
use App\Services\FieldInstallation\FieldInstallationAuditLogger;
use App\Services\Procurement\ProcurementAuditLogger;
use App\Services\Production\ProductionAuditLogger;
use App\Services\Roles\SyncDepartmentRolesToSpatie;
use App\Support\BiboStorage;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
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
        $this->app->singleton(FieldInstallationAuditLogger::class);
        $this->app->singleton(ProductionAuditLogger::class);
        $this->app->singleton(\App\Services\Projects\ProjectFifoOrderService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::bind('deck', fn ($id) => Deck::query()->findOrFail($id));
        Route::bind('section', fn ($id) => Section::query()->findOrFail($id));
        Route::bind('offcut', fn ($id) => OffcutPiece::query()->findOrFail($id));
        Route::bind('reservation', fn ($id) => StockReservation::query()->findOrFail($id));
        Route::bind('tool', fn ($id) => Tool::query()->findOrFail($id));
        Route::bind('issuance', fn ($id) => ToolIssuance::query()->findOrFail($id));
        Route::bind('toolIncident', fn ($id) => ToolIncident::query()->findOrFail($id));
        Route::bind('fieldJob', fn ($id) => FieldInstallationJob::query()->findOrFail($id));
        Route::bind('nonConformity', fn ($id) => FieldNonConformity::query()->findOrFail($id));
        Route::bind('toolAssignment', fn ($id) => FieldToolAssignment::query()->findOrFail($id));
        Route::bind('unit', fn ($id) => FieldInstallationUnit::query()->findOrFail($id));
        Route::bind('order', fn ($id) => ProductionOrder::query()->findOrFail($id));
        Route::bind('line', fn ($id) => CuttingSheet::query()->findOrFail($id));
        Route::bind('projectDispatch', fn ($id) => ProjectDispatch::query()->findOrFail($id));
        Route::bind('dco', fn ($id) => DesignChangeOrder::query()->findOrFail($id));

        Gate::policy(ProductionOrder::class, ProductionOrderPolicy::class);
        Gate::define('production.schedule.viewAny', fn (User $user) => app(ProductionSchedulePolicy::class)->viewAny($user));
        Gate::policy(Bin::class, StockMovementPolicy::class);
        Gate::policy(FieldInstallationJob::class, FieldInstallationJobPolicy::class);
        Gate::policy(OffcutPiece::class, OffcutPolicy::class);
        Gate::policy(Project::class, ProjectPolicy::class);

        Gate::define('logOffcut', fn (User $user, Bin $bin) => app(OffcutPolicy::class)->log($user, $bin));

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

        $this->registerProjectListeners();
        $this->registerProcurementListeners();
        $this->registerWarehouseListeners();
        $this->registerFieldInstallationListeners();
    }

    protected function registerFieldInstallationListeners(): void
    {
        Event::listen(FieldNonConformityReported::class, NotifyPmOnFieldNonConformity::class);
        Event::listen(FieldNonConformityReported::class, CreateDesignChangeOrderOnMeasurementNc::class);
        Event::listen(FieldInstallationCompleted::class, OnFieldInstallationCompleted::class);
        Event::listen(FieldDeliveryRecorded::class, AdvanceProjectOnFieldDeliveryAccepted::class);
        Event::listen(ProductionStageCompleted::class, ForwardNairobiFieldOnSashComplete::class);
        Event::listen(ProjectStageAdvanced::class, CreateFieldJobOnInstallationStage::class);
        $this->registerProductionListeners();
        $this->registerQualityControlListeners();
    }

    protected function registerProjectListeners(): void
    {
        Event::listen(DealProjectCreated::class, OnDealProjectCreated::class);
        Event::listen(ProjectBomFinalized::class, OnProjectBomFinalized::class);
        Event::listen(ProjectMaterialShortageDetected::class, OnProjectMaterialShortageDetected::class);
        Event::listen(ProjectMaterialsReserved::class, OnProjectMaterialsReserved::class);
        Event::listen(ProjectMaterialsReady::class, OnProjectMaterialsReady::class);
        Event::listen(ProductionStageCompleted::class, OnProductionStageCompleted::class);
    }

    protected function registerProcurementListeners(): void
    {
        Event::listen(ProjectMaterialShortageDetected::class, DraftPurchaseRequisitionFromShortage::class);
        Event::listen(ProjectAddonRequested::class, CreateAddonRequisition::class);
        Event::listen(PurchaseRequisitionApproved::class, UnlockPurchaseOrderCreation::class);
        Event::listen(ProductionStageCompleted::class, NotifyGlassProcurement::class);
    }

    protected function registerWarehouseListeners(): void
    {
        Event::listen(ProjectBomFinalized::class, HandleProjectBomFinalized::class);
        Event::listen(GoodsReceiptVerified::class, ReceiveGoodsIntoWarehouse::class);
        Event::listen(ProductionStageCompleted::class, ReleaseMaterialsOnProductionStageCompleted::class);
        Event::listen(WarehouseLowStockDetected::class, NotifyProcurementOfficersOfLowStock::class);
        Event::listen(ToolReplacementRequired::class, CreateToolIncidentOnReplacementRequired::class);
    }

    protected function registerProductionListeners(): void
    {
        Event::listen(ProjectMaterialsReady::class, CreateProductionOrder::class);
        Event::listen(ProjectMaterialsReady::class, NotifyProductionManagersOfNewOrder::class);
    }

    protected function registerQualityControlListeners(): void
    {
        Event::listen(ProductionStageCompleted::class, CreateProductionQcInspection::class);
        Event::listen(FieldInstallationCompleted::class, CreateSiteInspectionOnFieldJobComplete::class);
        Event::listen(FieldDeliveryRecorded::class, CreateSiteReceivingInspectionOnDelivery::class);
        Event::listen(QcInspectionCompleted::class, OnSiteInstallationQcCompleted::class);
    }
}
