<?php

namespace App\Models\Production;

use App\Enums\Production\ProductionStage;
use App\Enums\Production\TeamRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionOrderTeam extends Model
{
    protected $fillable = [
        'production_order_id',
        'user_id',
        'stage',
        'role',
        'assigned_at',
        'assigned_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'stage' => ProductionStage::class,
            'role' => TeamRole::class,
            'assigned_at' => 'datetime',
        ];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
