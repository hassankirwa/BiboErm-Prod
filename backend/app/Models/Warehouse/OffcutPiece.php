<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\OffcutStatus;
use App\Models\Project;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OffcutPiece extends Model
{
    use Auditable;

    public const UPDATED_AT = null;

    protected $fillable = [
        'offcut_number',
        'item_id',
        'bin_id',
        'length_mm',
        'quantity_pieces',
        'source_project_id',
        'source_movement_id',
        'status',
        'allocated_project_id',
        'logged_by',
        'logged_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => OffcutStatus::class,
            'logged_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function auditModule(): string
    {
        return 'warehouse';
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class, 'bin_id');
    }

    public function sourceProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'source_project_id');
    }

    public function allocatedProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'allocated_project_id');
    }

    public function loggedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }

    public function sourceMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'source_movement_id');
    }
}
