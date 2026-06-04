<?php

namespace App\Models\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Models\Project;
use App\Models\User;
use Database\Factories\Production\ProductionOrderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionOrder extends Model
{
    /** @use HasFactory<ProductionOrderFactory> */
    use HasFactory;

    protected $fillable = [
        'reference',
        'project_id',
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
            'fifo_position' => 'integer',
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

    public function teamLead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_team_lead');
    }

    public function stageLogs(): HasMany
    {
        return $this->hasMany(ProductionStageLog::class)->orderBy('id');
    }

    public function teams(): HasMany
    {
        return $this->hasMany(ProductionOrderTeam::class);
    }

    public function materialReleases(): HasMany
    {
        return $this->hasMany(ProductionMaterialRelease::class);
    }

    public function cuttingSheets(): HasMany
    {
        return $this->hasMany(CuttingSheet::class)->orderBy('sort_order');
    }

    public function isActive(): bool
    {
        return in_array($this->status, [
            ProductionOrderStatus::Scheduled,
            ProductionOrderStatus::InProgress,
        ], true);
    }
}
