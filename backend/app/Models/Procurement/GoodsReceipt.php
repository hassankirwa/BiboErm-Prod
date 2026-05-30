<?php

namespace App\Models\Procurement;

use App\Enums\Procurement\GoodsReceiptStatus;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GoodsReceipt extends Model
{
    protected $fillable = [
        'grn_number',
        'purchase_order_id',
        'project_id',
        'transport_order_id',
        'status',
        'received_at',
        'verified_at',
        'verified_by',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => GoodsReceiptStatus::class,
            'received_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function transportOrder(): BelongsTo
    {
        return $this->belongsTo(TransportOrder::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(GoodsReceiptLine::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(GoodsReceiptAttachment::class);
    }
}
