<?php

namespace App\Models\Warehouse;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaterialReleaseBatch extends Model
{
    protected $table = 'warehouse_material_release_batches';

    protected $fillable = [
        'project_id',
        'stock_reservation_id',
        'stock_movement_id',
        'released_by',
        'received_by',
        'notes',
        'is_partial',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'is_partial' => 'boolean',
            'released_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(StockReservation::class, 'stock_reservation_id');
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    public function releaser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(MaterialReleaseBatchLine::class, 'batch_id');
    }
}
