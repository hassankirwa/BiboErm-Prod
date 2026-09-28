<?php

namespace App\Models\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionOrder extends Model
{
    protected $fillable = [
        'reference',
        'project_id',
        'project_wave_id',
        'parent_production_order_id',
        'status',
        'current_stage',
        'fifo_position',
        'scheduled_start',
        'scheduled_end',
        'actual_start',
        'actual_end',
        'assigned_team_lead',
    ];

    protected function casts(): array
    {
        return [
            'status' => ProductionOrderStatus::class,
            'current_stage' => ProductionStage::class,
            'scheduled_start' => 'date',
            'scheduled_end' => 'date',
            'actual_start' => 'date',
            'actual_end' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function wave(): BelongsTo
    {
        return $this->belongsTo(\App\Models\ProjectWave::class, 'project_wave_id');
    }

    public function parentOrder(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_production_order_id');
    }

    public function remakeOrders(): HasMany
    {
        return $this->hasMany(self::class, 'parent_production_order_id');
    }

    public function stageLogs(): HasMany
    {
        return $this->hasMany(ProductionStageLog::class)->orderBy('id');
    }

    public function teams(): HasMany
    {
        return $this->hasMany(ProductionOrderTeam::class);
    }

    public function cuttingSheets(): HasMany
    {
        return $this->hasMany(CuttingSheet::class);
    }

    public function materialReleases(): HasMany
    {
        return $this->hasMany(ProductionMaterialRelease::class);
    }

    public function isActive(): bool
    {
        $status = $this->status instanceof ProductionOrderStatus
            ? $this->status
            : ProductionOrderStatus::tryFrom((string) $this->status);

        if (! $status) {
            return false;
        }

        return in_array($status, [
            ProductionOrderStatus::Scheduled,
            ProductionOrderStatus::InProgress,
        ], true);
    }
}
