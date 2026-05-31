<?php

namespace App\Models\Procurement;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportOrder extends Model
{
    protected $fillable = [
        'transport_number',
        'purchase_order_id',
        'transport_type',
        'vehicle',
        'driver_name',
        'driver_phone',
        'expected_arrival',
        'actual_arrival',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'expected_arrival' => 'datetime',
            'actual_arrival' => 'datetime',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
