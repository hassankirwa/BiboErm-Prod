<?php

namespace App\Models\Production;

use App\Enums\Production\ProductionStage;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionStageLog extends Model
{
    protected $fillable = [
        'production_order_id',
        'stage',
        'status',
        'completed_by',
        'started_at',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'stage' => ProductionStage::class,
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
