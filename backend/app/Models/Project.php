<?php

namespace App\Models;

use App\Enums\ProjectStage;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use Auditable, SoftDeletes;

    protected $fillable = [
        'reference',
        'name',
        'deal_id',
        'contact_id',
        'account_id',
        'type',
        'location_type',
        'site_address',
        'stage',
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
    ];

    protected function casts(): array
    {
        return [
            'stage' => ProjectStage::class,
            'quoted_amount' => 'decimal:2',
            'deposit_received' => 'decimal:2',
            'projected_start' => 'date',
            'projected_end' => 'date',
            'actual_start' => 'date',
            'actual_end' => 'date',
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

    public function stageLogs(): HasMany
    {
        return $this->hasMany(ProjectStageLog::class);
    }
}
