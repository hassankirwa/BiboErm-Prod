<?php

namespace App\Models;

use App\Enums\InstallMode;
use App\Enums\ProjectStage;
use App\Models\FieldInstallation\FieldInstallationJob;
use App\Models\Projects\DesignChangeOrder;
use App\Models\Projects\ProjectDispatch;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'reference',
        'client_portal_code',
        'name',
        'deal_id',
        'contact_id',
        'account_id',
        'type',
        'location_type',
        'install_mode',
        'site_address',
        'stage',
        'is_active',
        'completion_percent',
        'priority',
        'quoted_amount',
        'deposit_received',
        'overage_buffer_percent',
        'projected_start',
        'projected_end',
        'actual_start',
        'actual_end',
        'sales_rep_id',
        'project_manager_id',
        'client_notes',
        'internal_notes',
        'stage_data',
    ];

    protected function casts(): array
    {
        return [
            'stage' => ProjectStage::class,
            'is_active' => 'boolean',
            'install_mode' => InstallMode::class,
            'quoted_amount' => 'decimal:2',
            'deposit_received' => 'decimal:2',
            'projected_start' => 'date',
            'projected_end' => 'date',
            'actual_start' => 'date',
            'actual_end' => 'date',
            'stage_data' => 'array',
        ];
    }

    public function auditModule(): string
    {
        return 'projects';
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function stageLogs(): HasMany
    {
        return $this->hasMany(ProjectStageLog::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ProjectDocument::class)->orderByDesc('version');
    }

    public function boms(): HasMany
    {
        return $this->hasMany(ProjectBom::class)->orderByDesc('version');
    }

    public function latestBom(): HasOne
    {
        return $this->hasOne(ProjectBom::class)->latestOfMany('version');
    }

    public function engineers(): HasMany
    {
        return $this->hasMany(ProjectEngineer::class)->whereNull('removed_at');
    }

    public function engineerAssignments(): HasMany
    {
        return $this->hasMany(ProjectEngineer::class);
    }

    public function delays(): HasMany
    {
        return $this->hasMany(ProjectDelay::class)->latest('logged_at');
    }

    public function fieldInstallationJobs(): HasMany
    {
        return $this->hasMany(FieldInstallationJob::class);
    }

    public function dispatches(): HasMany
    {
        return $this->hasMany(ProjectDispatch::class);
    }

    public function designChangeOrders(): HasMany
    {
        return $this->hasMany(DesignChangeOrder::class);
    }

    public function floors(): HasMany
    {
        return $this->hasMany(ProjectFloor::class)->orderBy('sort_order');
    }

    public function siteVisits(): HasMany
    {
        return $this->hasMany(SiteVisit::class);
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->can('projects.view_all') || $user->can('projects.manage') || $user->can('projects.material_status.view')) {
            return $query;
        }

        return $query->where(function ($projectQuery) use ($user) {
            $projectQuery
                ->where('project_manager_id', $user->id)
                ->orWhere('sales_rep_id', $user->id)
                ->orWhereHas('engineerAssignments', function ($engineersQuery) use ($user) {
                    $engineersQuery
                        ->where('user_id', $user->id)
                        ->whereNull('removed_at');
                });
        });
    }

    /** Nairobi projects: fabrication at workshop, then full install on site. */
    public function isNairobiTwoPhase(): bool
    {
        return $this->location_type === 'nairobi';
    }

    /** @deprecated Use isNairobiTwoPhase() — Nairobi is two-phase, not fabrication-only. */
    public function isFabricationOnlyNairobi(): bool
    {
        return false;
    }
}
