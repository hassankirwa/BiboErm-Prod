<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\StockMovementType;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockMovement extends Model
{
    use Auditable;

    public const UPDATED_AT = null;

    protected $fillable = [
        'movement_number',
        'movement_type',
        'reference_type',
        'reference_id',
        'notes',
        'performed_by',
        'performed_at',
    ];

    protected function casts(): array
    {
        return [
            'movement_type' => StockMovementType::class,
            'performed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function auditModule(): string
    {
        return 'warehouse';
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockMovementLine::class);
    }
}
