<?php

namespace App\Models\Procurement;

use App\Enums\Procurement\GlassOrderStatus;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlassOrder extends Model
{
    protected $fillable = [
        'order_number',
        'project_id',
        'supplier_id',
        'purchase_order_id',
        'specs',
        'status',
        'ordered_at',
        'expected_delivery',
        'delivered_at',
        'delivery_location',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'specs' => 'array',
            'status' => GlassOrderStatus::class,
            'expected_delivery' => 'date',
            'ordered_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
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
