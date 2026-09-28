<?php

namespace App\Models\Warehouse;

use App\Enums\Warehouse\MaterialRequestSource;
use App\Enums\Warehouse\MaterialRequestStatus;
use App\Models\Procurement\PurchaseRequisition;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaterialRequest extends Model
{
    protected $table = 'warehouse_material_requests';

    protected $fillable = [
        'project_id',
        'requested_by',
        'source',
        'status',
        'reason',
        'notes',
        'fulfilled_by',
        'fulfilled_at',
        'stock_movement_id',
        'purchase_requisition_id',
    ];

    protected function casts(): array
    {
        return [
            'source' => MaterialRequestSource::class,
            'status' => MaterialRequestStatus::class,
            'fulfilled_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function fulfiller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fulfilled_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(MaterialRequestLine::class, 'material_request_id');
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }
}
