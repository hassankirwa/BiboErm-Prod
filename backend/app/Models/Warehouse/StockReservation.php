<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\ReservationStatus;
use App\Models\Project;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockReservation extends Model
{
    use Auditable;

    protected $fillable = [
        'reservation_number',
        'project_id',
        'status',
        'reserved_at',
        'reserved_by',
        'received_by',
        'released_at',
        'fifo_sequence',
        'notes',
        'release_notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'reserved_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function auditModule(): string
    {
        return 'warehouse';
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function reservedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reserved_by');
    }

    public function receivedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(StockReservationLine::class, 'reservation_id');
    }
}
